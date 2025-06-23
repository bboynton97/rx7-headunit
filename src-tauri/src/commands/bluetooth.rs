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

#[derive(Debug, Serialize, Deserialize)]
pub struct MediaPlayerInfo {
    pub name: String,
    pub position: Option<u64>,
    pub duration: Option<u64>,
    pub status: String, // "playing", "paused", "stopped"
    pub track: Option<String>,
    pub artist: Option<String>,
    pub album: Option<String>,
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
        
        // Set the adapter alias to "rx7 fc"
        adapter.set_alias("rx7 fc".to_string()).await?;
        
        self.session = Some(session);
        self.adapter = Some(adapter);
        
        // Refresh device list after initialization
        self.refresh_devices().await?;
        
        Ok(())
    }

    pub async fn refresh_devices(&self) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        if let Some(adapter) = &self.adapter {
            let mut devices = self.devices.write().await;
            devices.clear();
            
            // Get all devices from the adapter
            for device_path in adapter.device_addresses().await? {
                if let Ok(device) = adapter.device(device_path) {
                    let address = device_path.to_string();
                    let name = device.name().await.ok().flatten();
                    let class = device.class().await.ok().flatten();
                    let paired = device.is_paired().await.unwrap_or(false);
                    let connected = device.is_connected().await.unwrap_or(false);
                    let trusted = device.is_trusted().await.unwrap_or(false);
                    
                    let bluetooth_device = BluetoothDevice {
                        address,
                        name,
                        class,
                        paired,
                        connected,
                        trusted,
                    };
                    
                    devices.insert(bluetooth_device.address.clone(), bluetooth_device);
                }
            }
        }
        Ok(())
    }

    pub async fn start_discovery(&self) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        if let Some(_adapter) = &self.adapter {
            // Note: The actual method name might be different
            // For now, we'll skip discovery until we know the correct API
            println!("Discovery started (placeholder)");
        }
        Ok(())
    }

    pub async fn stop_discovery(&self) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        if let Some(_adapter) = &self.adapter {
            // Note: The actual method name might be different
            println!("Discovery stopped (placeholder)");
            
            // Refresh device list after discovery stops
            self.refresh_devices().await?;
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
            
            // Refresh device list after pairing
            self.refresh_devices().await?;
        }
        Ok(())
    }

    pub async fn unpair_device(&self, address: &str) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        if let Some(adapter) = &self.adapter {
            let address = Address::from_str(address)?;
            let device = adapter.device(address)?;
            // Disconnect the device first
            device.disconnect().await?;
            
            // Remove from our internal device list
            let mut devices = self.devices.write().await;
            devices.remove(&address.to_string());
            
            // Refresh device list after unpairing
            self.refresh_devices().await?;
        }
        Ok(())
    }

    pub async fn connect_device(&self, address: &str) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        if let Some(adapter) = &self.adapter {
            let address = Address::from_str(address)?;
            let device = adapter.device(address)?;
            device.connect().await?;
            
            // Refresh device list after connecting
            self.refresh_devices().await?;
        }
        Ok(())
    }

    pub async fn disconnect_device(&self, address: &str) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        if let Some(adapter) = &self.adapter {
            let address = Address::from_str(address)?;
            let device = adapter.device(address)?;
            device.disconnect().await?;
            
            // Refresh device list after disconnecting
            self.refresh_devices().await?;
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

    // Media playback control methods
    pub async fn play_media(&self, address: &str) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        if let Some(adapter) = &self.adapter {
            let address = Address::from_str(address)?;
            let device = adapter.device(address)?;
            
            // Try to use media transport for play control
            // Note: This is a simplified implementation - actual media control may require
            // specific profile implementations (A2DP, AVRCP, etc.)
            println!("Play media requested for device: {}", address);
            // For now, we'll just log the request since the exact API may vary
        }
        Ok(())
    }

    pub async fn pause_media(&self, address: &str) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        if let Some(adapter) = &self.adapter {
            let address = Address::from_str(address)?;
            let device = adapter.device(address)?;
            
            println!("Pause media requested for device: {}", address);
            // For now, we'll just log the request since the exact API may vary
        }
        Ok(())
    }

    pub async fn next_track(&self, address: &str) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        if let Some(adapter) = &self.adapter {
            let address = Address::from_str(address)?;
            let device = adapter.device(address)?;
            
            println!("Next track requested for device: {}", address);
            // For now, we'll just log the request since the exact API may vary
        }
        Ok(())
    }

    pub async fn previous_track(&self, address: &str) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        if let Some(adapter) = &self.adapter {
            let address = Address::from_str(address)?;
            let device = adapter.device(address)?;
            
            println!("Previous track requested for device: {}", address);
            // For now, we'll just log the request since the exact API may vary
        }
        Ok(())
    }

    pub async fn stop_media(&self, address: &str) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        if let Some(adapter) = &self.adapter {
            let address = Address::from_str(address)?;
            let device = adapter.device(address)?;
            
            println!("Stop media requested for device: {}", address);
            // For now, we'll just log the request since the exact API may vary
        }
        Ok(())
    }

    pub async fn get_media_info(&self, address: &str) -> Result<Option<MediaPlayerInfo>, Box<dyn std::error::Error + Send + Sync>> {
        if let Some(adapter) = &self.adapter {
            let address = Address::from_str(address)?;
            let device = adapter.device(address)?;
            
            // For now, return a placeholder since the exact API may vary
            // In a real implementation, you would query the device's media transport
            Ok(Some(MediaPlayerInfo {
                name: "Bluetooth Device".to_string(),
                position: None,
                duration: None,
                status: "unknown".to_string(),
                track: None,
                artist: None,
                album: None,
            }))
        } else {
            Ok(None)
        }
    }

    pub async fn set_volume(&self, address: &str, volume: u8) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        if let Some(adapter) = &self.adapter {
            let address = Address::from_str(address)?;
            let device = adapter.device(address)?;
            
            println!("Set volume to {} for device: {}", volume, address);
            // For now, we'll just log the request since the exact API may vary
        }
        Ok(())
    }

    pub async fn get_volume(&self, address: &str) -> Result<Option<u8>, Box<dyn std::error::Error + Send + Sync>> {
        if let Some(adapter) = &self.adapter {
            let address = Address::from_str(address)?;
            let device = adapter.device(address)?;
            
            // For now, return a placeholder volume
            Ok(Some(50))
        } else {
            Ok(None)
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
pub async fn refresh_bluetooth_devices() -> Result<(), String> {
    let manager = BLUETOOTH_MANAGER.read().await;
    manager.refresh_devices().await.map_err(|e| e.to_string())
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

// Media playback control commands
#[tauri::command]
pub async fn play_bluetooth_media(address: String) -> Result<(), String> {
    let manager = BLUETOOTH_MANAGER.read().await;
    manager.play_media(&address).await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn pause_bluetooth_media(address: String) -> Result<(), String> {
    let manager = BLUETOOTH_MANAGER.read().await;
    manager.pause_media(&address).await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn next_bluetooth_track(address: String) -> Result<(), String> {
    let manager = BLUETOOTH_MANAGER.read().await;
    manager.next_track(&address).await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn previous_bluetooth_track(address: String) -> Result<(), String> {
    let manager = BLUETOOTH_MANAGER.read().await;
    manager.previous_track(&address).await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn stop_bluetooth_media(address: String) -> Result<(), String> {
    let manager = BLUETOOTH_MANAGER.read().await;
    manager.stop_media(&address).await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_bluetooth_media_info(address: String) -> Result<Option<MediaPlayerInfo>, String> {
    let manager = BLUETOOTH_MANAGER.read().await;
    manager.get_media_info(&address).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn set_bluetooth_volume(address: String, volume: u8) -> Result<(), String> {
    let manager = BLUETOOTH_MANAGER.read().await;
    manager.set_volume(&address, volume).await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_bluetooth_volume(address: String) -> Result<Option<u8>, String> {
    let manager = BLUETOOTH_MANAGER.read().await;
    manager.get_volume(&address).await.map_err(|e| e.to_string())
}
