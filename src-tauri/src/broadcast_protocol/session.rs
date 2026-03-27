#![allow(dead_code)]

use fnv::FnvHashMap;
use log::debug;

use crate::broadcast_protocol::protocol::inbound::{self, Driver, EntrylistCar, Lap, RealtimeCarUpdate, TrackData};

/// The state of a Car in the current session
///
/// At least for now, the complete state is sent with each [`RealtimeCarUpdate`](inbound::RealtimeCarUpdate)
/// packet, so this is just a type alias to the packet definition.
pub type CarState = RealtimeCarUpdate;

#[derive(Debug, Clone)]
pub struct CarContext {
    pub entry: Option<EntrylistCar<'static>>,
    pub state: Option<CarState>,
    pub laps: Vec<(u16, Lap)>,
}

impl CarContext {
    fn new_from_entry(entry: EntrylistCar<'static>) -> CarContext {
        CarContext {
            entry: Some(entry),
            state: None,
            laps: vec![],
        }
    }

    fn new_from_update(update: RealtimeCarUpdate) -> CarContext {
        CarContext {
            entry: None,
            state: Some(update),
            laps: vec![],
        }
    }

    pub fn current_driver(&self) -> Option<&Driver<'_>> {
        self.entry.as_ref().map(|e| {
            assert!(e.drivers.len() >= e.current_driver_index as usize);
            &e.drivers[e.current_driver_index as usize]
        })
    }
}

#[derive(Default)]
pub struct Context {
    track: Option<TrackData<'static>>,
    cars: FnvHashMap<u16, CarContext>,
}

impl Context {
    pub fn new() -> Context {
        Context::default()
    }

    pub fn track_data(&self) -> Option<&TrackData<'_>> {
        self.track.as_ref()
    }

    pub fn car_by_id(&self, id: u16) -> Option<&CarContext> {
        self.cars.get(&id)
    }

    pub fn car_by_race_number(&self, number: i32) -> Option<&CarContext> {
        self.cars.iter().find_map(|(_, v)| {
            v.entry.as_ref().and_then(|e| {
                if e.race_number == number {
                    Some(v)
                } else {
                    None
                }
            })
        })
    }

    pub(crate) fn update_track_data(&mut self, track_data: inbound::TrackData) {
        self.track = Some(track_data.into_owned());
    }

    /// Takes an [`EntrylistUpdate`](crate::broadcast_protocol::protocol::inbound::EntrylistUpdate) and prepares the internal
    /// `HashMap` for updates which will arrive shortly afterwards.
    pub(crate) fn seed_entrylist(&mut self, update: &inbound::EntrylistUpdate) {
        // First ensure enough space is allocated for the whole set of Cars
        if self.cars.capacity() < update.car_ids.len() {
            self.cars
                .reserve(update.car_ids.len() - self.cars.capacity());
        }

        // Retain only the car IDs still in the entry list
        self.cars.retain(|&k, _| update.car_ids.contains(&k));
    }

    pub(crate) fn update_car_entry(&mut self, updated_car: EntrylistCar) {
        if let Some(e) = self.cars.get_mut(&updated_car.id) {
            e.entry = Some(updated_car.into_owned());
        } else {
            self.cars.insert(
                updated_car.id,
                CarContext::new_from_entry(updated_car.into_owned()),
            );
        }
    }

    pub(crate) fn update_car_state(&mut self, update: RealtimeCarUpdate) {
        if let Some(e) = self.cars.get_mut(&update.id) {
            // Check if a lap has been completed
            if let Some(ref previous) = e.state {
                if update.laps > previous.laps {
                    debug!("Storing new lap {} for car {}", update.laps, update.id);
                    e.laps.push((update.laps, update.last_lap));
                }
            }
            // Overwrite the state with the new snapshot
            e.state = Some(update);
        } else {
            self.cars
                .insert(update.id, CarContext::new_from_update(update.clone()));
            // We might be connecting mid-session with a lap already completed
            if update.laps > 0 {
                debug!("Storing new lap {} for car {}", update.laps, update.id);
                self.cars
                    .get_mut(&update.id)
                    .unwrap()
                    .laps
                    .push((update.laps, update.last_lap));
            }
        }
    }
}

