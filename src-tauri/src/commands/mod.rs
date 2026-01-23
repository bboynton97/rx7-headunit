pub mod audio;

#[cfg(target_os = "linux")]
pub mod bluetooth;

#[cfg(target_os = "linux")]
pub mod display;

#[cfg(target_os = "linux")]
pub mod media_player;

// Stub implementations for non-Linux platforms
#[cfg(not(target_os = "linux"))]
pub mod bluetooth {
    use serde::{Deserialize, Serialize};

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
        pub status: String,
        pub track: Option<String>,
        pub artist: Option<String>,
        pub album: Option<String>,
    }

    #[tauri::command]
    pub async fn initialize_bluetooth() -> Result<(), String> {
        Err("Bluetooth not supported on this platform".to_string())
    }

    #[tauri::command]
    pub async fn start_bluetooth_discovery() -> Result<(), String> {
        Err("Bluetooth not supported on this platform".to_string())
    }

    #[tauri::command]
    pub async fn stop_bluetooth_discovery() -> Result<(), String> {
        Err("Bluetooth not supported on this platform".to_string())
    }

    #[tauri::command]
    pub async fn get_bluetooth_devices() -> Result<Vec<BluetoothDevice>, String> {
        Ok(vec![])
    }

    #[tauri::command]
    pub async fn pair_bluetooth_device(_address: String) -> Result<(), String> {
        Err("Bluetooth not supported on this platform".to_string())
    }

    #[tauri::command]
    pub async fn unpair_bluetooth_device(_address: String) -> Result<(), String> {
        Err("Bluetooth not supported on this platform".to_string())
    }

    #[tauri::command]
    pub async fn connect_bluetooth_device(_address: String) -> Result<(), String> {
        Err("Bluetooth not supported on this platform".to_string())
    }

    #[tauri::command]
    pub async fn disconnect_bluetooth_device(_address: String) -> Result<(), String> {
        Err("Bluetooth not supported on this platform".to_string())
    }

    #[tauri::command]
    pub async fn get_bluetooth_audio_sinks(_address: String) -> Result<Vec<String>, String> {
        Ok(vec![])
    }

    #[tauri::command]
    pub async fn refresh_bluetooth_devices() -> Result<(), String> {
        Ok(())
    }

    #[tauri::command]
    pub async fn get_bluetooth_status() -> Result<BluetoothStatus, String> {
        Ok(BluetoothStatus {
            adapter_powered: false,
            discoverable: false,
            pairable: false,
            devices: vec![],
        })
    }

    #[tauri::command]
    pub async fn play_bluetooth_media(_address: String) -> Result<(), String> {
        Err("Bluetooth not supported on this platform".to_string())
    }

    #[tauri::command]
    pub async fn pause_bluetooth_media(_address: String) -> Result<(), String> {
        Err("Bluetooth not supported on this platform".to_string())
    }

    #[tauri::command]
    pub async fn next_bluetooth_track(_address: String) -> Result<(), String> {
        Err("Bluetooth not supported on this platform".to_string())
    }

    #[tauri::command]
    pub async fn previous_bluetooth_track(_address: String) -> Result<(), String> {
        Err("Bluetooth not supported on this platform".to_string())
    }

    #[tauri::command]
    pub async fn stop_bluetooth_media(_address: String) -> Result<(), String> {
        Err("Bluetooth not supported on this platform".to_string())
    }

    #[tauri::command]
    pub async fn get_bluetooth_media_info(_address: String) -> Result<Option<MediaPlayerInfo>, String> {
        Ok(None)
    }

    #[tauri::command]
    pub async fn set_bluetooth_volume(_address: String, _volume: u8) -> Result<(), String> {
        Err("Bluetooth not supported on this platform".to_string())
    }

    #[tauri::command]
    pub async fn get_bluetooth_volume(_address: String) -> Result<Option<u8>, String> {
        Ok(None)
    }
}

#[cfg(not(target_os = "linux"))]
pub mod display {
    #[tauri::command]
    pub fn set_brightness(value: u8) -> Result<(), String> {
        println!("Brightness control not available on this platform (requested: {})", value);
        Ok(())
    }
}
