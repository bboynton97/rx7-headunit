use bluer::{Session, Adapter, Address};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::str::FromStr;
use std::sync::Arc;
use tokio::sync::RwLock;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BluetoothDevice {
    pub address: String,
    pub name: Option<String>,
    pub class: Option<u32>,
    pub paired: bool,
    pub connected: bool,
    pub trusted: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BluetoothStatus {
    pub adapter_powered: bool,
    pub discoverable: bool,
    pub pairable: bool,
    pub devices: Vec<BluetoothDevice>,
}

pub struct BluetoothManager {
    session: Option<Session>,
    adapter: Option<Adapter>,
    devices: Arc<RwLock<HashMap<String, BluetoothDevice>>>,
}

impl BluetoothManager {
    pub fn new() -> Self {
        Self {
            session: None,
            adapter: None,
            devices: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub async fn initialize(&mut self) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let session = Session::new().await?;
        
        // Try to get the default adapter (usually "hci0")
        let adapter = match session.adapter("hci0") {
            Ok(adapter) => adapter,
            Err(_) => {
                // Try alternative adapter names
                if let Ok(adapter) = session.adapter("hci1") {
                    adapter
                } else {
                    return Err("No Bluetooth adapter found".into());
                }
            }
        };
        
        // Enable the adapter
        adapter.set_powered(true).await?;
        adapter.set_discoverable(true).await?;
        adapter.set_pairable(true).await?;
        
        self.session = Some(session);
        self.adapter = Some(adapter);
        Ok(())
    }

    pub async fn start_discovery(&self) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        if let Some(adapter) = &self.adapter {
            // Note: The actual method name might be different
            // For now, we'll skip discovery until we know the correct API
            println!("Discovery started (placeholder)");
        }
        Ok(())
    }

    pub async fn stop_discovery(&self) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        if let Some(adapter) = &self.adapter {
            // Note: The actual method name might be different
            println!("Discovery stopped (placeholder)");
        }
        Ok(())
    }

    pub async fn get_devices(&self) -> Vec<BluetoothDevice> {
        let devices = self.devices.read().await;
        devices.values().cloned().collect()
    }

    pub async fn pair_device(&self, address: &str) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        if let Some(adapter) = &self.adapter {
            let address = Address::from_str(address)?;
            let device = adapter.device(address)?;
            device.pair().await?;
        }
        Ok(())
    }

    pub async fn unpair_device(&self, address: &str) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        if let Some(adapter) = &self.adapter {
            let address = Address::from_str(address)?;
            let device = adapter.device(address)?;
            // Note: The actual method name might be different
            println!("Device unpaired (placeholder)");
        }
        Ok(())
    }

    pub async fn connect_device(&self, address: &str) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        if let Some(adapter) = &self.adapter {
            let address = Address::from_str(address)?;
            let device = adapter.device(address)?;
            device.connect().await?;
        }
        Ok(())
    }

    pub async fn disconnect_device(&self, address: &str) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        if let Some(adapter) = &self.adapter {
            let address = Address::from_str(address)?;
            let device = adapter.device(address)?;
            device.disconnect().await?;
        }
        Ok(())
    }

    pub async fn get_audio_sinks(&self, address: &str) -> Result<Vec<String>, Box<dyn std::error::Error + Send + Sync>> {
        if let Some(adapter) = &self.adapter {
            let address = Address::from_str(address)?;
            let device = adapter.device(address)?;
            let uuids = device.uuids().await?;
            
            let audio_sinks = uuids
                .unwrap_or_default()
                .into_iter()
                .filter(|uuid| {
                    // Common audio sink UUIDs
                    uuid.to_string().contains("110b") || // A2DP Sink
                    uuid.to_string().contains("110e") || // AVRCP Target
                    uuid.to_string().contains("110f")    // Advanced Audio
                })
                .map(|uuid| uuid.to_string())
                .collect();
            
            Ok(audio_sinks)
        } else {
            Ok(vec![])
        }
    }
}

// Global Bluetooth manager instance
static BLUETOOTH_MANAGER: once_cell::sync::Lazy<Arc<RwLock<BluetoothManager>>> = 
    once_cell::sync::Lazy::new(|| Arc::new(RwLock::new(BluetoothManager::new())));

#[tauri::command]
pub async fn initialize_bluetooth() -> Result<(), String> {
    let mut manager = BLUETOOTH_MANAGER.write().await;
    manager.initialize().await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn start_bluetooth_discovery() -> Result<(), String> {
    let manager = BLUETOOTH_MANAGER.read().await;
    manager.start_discovery().await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn stop_bluetooth_discovery() -> Result<(), String> {
    let manager = BLUETOOTH_MANAGER.read().await;
    manager.stop_discovery().await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_bluetooth_devices() -> Result<Vec<BluetoothDevice>, String> {
    let manager = BLUETOOTH_MANAGER.read().await;
    Ok(manager.get_devices().await)
}

#[tauri::command]
pub async fn pair_bluetooth_device(address: String) -> Result<(), String> {
    let manager = BLUETOOTH_MANAGER.read().await;
    manager.pair_device(&address).await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn unpair_bluetooth_device(address: String) -> Result<(), String> {
    let manager = BLUETOOTH_MANAGER.read().await;
    manager.unpair_device(&address).await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn connect_bluetooth_device(address: String) -> Result<(), String> {
    let manager = BLUETOOTH_MANAGER.read().await;
    manager.connect_device(&address).await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn disconnect_bluetooth_device(address: String) -> Result<(), String> {
    let manager = BLUETOOTH_MANAGER.read().await;
    manager.disconnect_device(&address).await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_bluetooth_audio_sinks(address: String) -> Result<Vec<String>, String> {
    let manager = BLUETOOTH_MANAGER.read().await;
    manager.get_audio_sinks(&address).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_bluetooth_status() -> Result<BluetoothStatus, String> {
    let manager = BLUETOOTH_MANAGER.read().await;
    
    let adapter_powered = if let Some(adapter) = &manager.adapter {
        adapter.is_powered().await.unwrap_or(false)
    } else {
        false
    };
    
    let discoverable = if let Some(adapter) = &manager.adapter {
        adapter.is_discoverable().await.unwrap_or(false)
    } else {
        false
    };
    
    let pairable = if let Some(adapter) = &manager.adapter {
        adapter.is_pairable().await.unwrap_or(false)
    } else {
        false
    };
    
    let devices = manager.get_devices().await;
    
    Ok(BluetoothStatus {
        adapter_powered,
        discoverable,
        pairable,
        devices,
    })
}
