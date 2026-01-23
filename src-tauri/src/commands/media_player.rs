use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use zbus::{Connection, zvariant::OwnedValue};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MediaPlayerInfo {
    pub name: String,
    pub position: Option<u64>,
    pub duration: Option<u64>,
    pub status: String,
    pub track: Option<String>,
    pub artist: Option<String>,
    pub album: Option<String>,
}

/// D-Bus proxy for BlueZ MediaPlayer1 interface
#[zbus::proxy(
    interface = "org.bluez.MediaPlayer1",
    default_service = "org.bluez"
)]
trait MediaPlayer1 {
    fn play(&self) -> zbus::Result<()>;
    fn pause(&self) -> zbus::Result<()>;
    fn stop(&self) -> zbus::Result<()>;
    fn next(&self) -> zbus::Result<()>;
    fn previous(&self) -> zbus::Result<()>;
    
    #[zbus(property)]
    fn status(&self) -> zbus::Result<String>;
    
    #[zbus(property)]
    fn position(&self) -> zbus::Result<u32>;
    
    #[zbus(property)]
    fn track(&self) -> zbus::Result<HashMap<String, OwnedValue>>;
}

/// D-Bus proxy for BlueZ MediaTransport1 interface (for volume)
#[zbus::proxy(
    interface = "org.bluez.MediaTransport1",
    default_service = "org.bluez"
)]
trait MediaTransport1 {
    #[zbus(property)]
    fn volume(&self) -> zbus::Result<u16>;
    
    #[zbus(property)]
    fn set_volume(&self, volume: u16) -> zbus::Result<()>;
}

/// Convert a Bluetooth address (78:3F:4D:F4:02:CE) to D-Bus path format (78_3F_4D_F4_02_CE)
fn address_to_dbus_path(address: &str) -> String {
    address.replace(':', "_")
}

/// Find the media player path for a given device
async fn find_media_player_path(connection: &Connection, address: &str) -> Option<String> {
    let addr_path = address_to_dbus_path(address);
    let device_path = format!("/org/bluez/hci0/dev_{}", addr_path);
    
    // Try common player paths
    let player_paths = vec![
        format!("{}/player0", device_path),
        format!("{}/player1", device_path),
    ];
    
    for path in player_paths {
        // Check if the path exists by trying to create a proxy and call status
        if let Ok(proxy) = MediaPlayer1Proxy::builder(connection)
            .path(path.as_str())
            .expect("Invalid path")
            .build()
            .await
        {
            if proxy.status().await.is_ok() {
                println!("Found media player at: {}", path);
                return Some(path);
            }
        }
    }
    
    // Try to enumerate objects to find the player
    if let Ok(paths) = enumerate_bluez_players(connection).await {
        for path in paths {
            if path.contains(&addr_path) {
                println!("Found media player via enumeration: {}", path);
                return Some(path);
            }
        }
    }
    
    None
}

/// Enumerate all BlueZ media players via ObjectManager
async fn enumerate_bluez_players(connection: &Connection) -> Result<Vec<String>, Box<dyn std::error::Error + Send + Sync>> {
    use zbus::fdo::ObjectManagerProxy;
    
    let om_proxy = ObjectManagerProxy::builder(connection)
        .destination("org.bluez")?
        .path("/")?
        .build()
        .await?;
    
    let objects = om_proxy.get_managed_objects().await?;
    
    let player_paths: Vec<String> = objects
        .into_iter()
        .filter(|(_, interfaces)| interfaces.contains_key("org.bluez.MediaPlayer1"))
        .map(|(path, _)| path.to_string())
        .collect();
    
    println!("Found {} media players via enumeration", player_paths.len());
    for path in &player_paths {
        println!("  - {}", path);
    }
    
    Ok(player_paths)
}

/// Find the media transport path for volume control
async fn find_media_transport_path(connection: &Connection, address: &str) -> Option<String> {
    let addr_path = address_to_dbus_path(address);
    let device_path = format!("/org/bluez/hci0/dev_{}", addr_path);
    
    // Try common transport paths
    let transport_paths = vec![
        format!("{}/fd0", device_path),
        format!("{}/fd1", device_path),
        format!("{}/sep1/fd0", device_path),
    ];
    
    for path in transport_paths {
        if let Ok(proxy) = MediaTransport1Proxy::builder(connection)
            .path(path.as_str())
            .expect("Invalid path")
            .build()
            .await
        {
            if proxy.volume().await.is_ok() {
                return Some(path);
            }
        }
    }
    
    None
}

pub async fn play_media(address: &str) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let connection = Connection::system().await?;
    
    if let Some(player_path) = find_media_player_path(&connection, address).await {
        let proxy = MediaPlayer1Proxy::builder(&connection)
            .path(player_path.as_str())?
            .build()
            .await?;
        
        proxy.play().await?;
        println!("Play command sent successfully");
    } else {
        println!("No media player found for device: {}", address);
    }
    
    Ok(())
}

pub async fn pause_media(address: &str) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let connection = Connection::system().await?;
    
    if let Some(player_path) = find_media_player_path(&connection, address).await {
        let proxy = MediaPlayer1Proxy::builder(&connection)
            .path(player_path.as_str())?
            .build()
            .await?;
        
        proxy.pause().await?;
        println!("Pause command sent successfully");
    } else {
        println!("No media player found for device: {}", address);
    }
    
    Ok(())
}

pub async fn stop_media(address: &str) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let connection = Connection::system().await?;
    
    if let Some(player_path) = find_media_player_path(&connection, address).await {
        let proxy = MediaPlayer1Proxy::builder(&connection)
            .path(player_path.as_str())?
            .build()
            .await?;
        
        proxy.stop().await?;
        println!("Stop command sent successfully");
    } else {
        println!("No media player found for device: {}", address);
    }
    
    Ok(())
}

pub async fn next_track(address: &str) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let connection = Connection::system().await?;
    
    if let Some(player_path) = find_media_player_path(&connection, address).await {
        let proxy = MediaPlayer1Proxy::builder(&connection)
            .path(player_path.as_str())?
            .build()
            .await?;
        
        proxy.next().await?;
        println!("Next track command sent successfully");
    } else {
        println!("No media player found for device: {}", address);
    }
    
    Ok(())
}

pub async fn previous_track(address: &str) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let connection = Connection::system().await?;
    
    if let Some(player_path) = find_media_player_path(&connection, address).await {
        let proxy = MediaPlayer1Proxy::builder(&connection)
            .path(player_path.as_str())?
            .build()
            .await?;
        
        proxy.previous().await?;
        println!("Previous track command sent successfully");
    } else {
        println!("No media player found for device: {}", address);
    }
    
    Ok(())
}

pub async fn get_media_info(address: &str) -> Result<Option<MediaPlayerInfo>, Box<dyn std::error::Error + Send + Sync>> {
    let connection = Connection::system().await?;
    
    if let Some(player_path) = find_media_player_path(&connection, address).await {
        let proxy = MediaPlayer1Proxy::builder(&connection)
            .path(player_path.as_str())?
            .build()
            .await?;
        
        let status = proxy.status().await.unwrap_or_else(|_| "unknown".to_string());
        let position = proxy.position().await.ok().map(|p| p as u64);
        
        let track_data = proxy.track().await.unwrap_or_default();
        
        // Extract track metadata
        let track = extract_string_from_variant(&track_data, "Title");
        let artist = extract_string_from_variant(&track_data, "Artist");
        let album = extract_string_from_variant(&track_data, "Album");
        let duration = extract_u64_from_variant(&track_data, "Duration");
        
        println!("Media info - Status: {}, Track: {:?}, Artist: {:?}, Position: {:?}, Duration: {:?}", 
            status, track, artist, position, duration);
        
        Ok(Some(MediaPlayerInfo {
            name: "Bluetooth".to_string(),
            position,
            duration,
            status,
            track,
            artist,
            album,
        }))
    } else {
        println!("No media player found for device: {}", address);
        Ok(None)
    }
}

pub async fn get_volume(address: &str) -> Result<Option<u8>, Box<dyn std::error::Error + Send + Sync>> {
    let connection = Connection::system().await?;
    
    if let Some(transport_path) = find_media_transport_path(&connection, address).await {
        let proxy = MediaTransport1Proxy::builder(&connection)
            .path(transport_path.as_str())?
            .build()
            .await?;
        
        let volume = proxy.volume().await?;
        // BlueZ volume is 0-127, convert to 0-100
        let volume_percent = ((volume as f32 / 127.0) * 100.0) as u8;
        Ok(Some(volume_percent))
    } else {
        Ok(None)
    }
}

pub async fn set_volume(address: &str, volume: u8) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let connection = Connection::system().await?;
    
    if let Some(transport_path) = find_media_transport_path(&connection, address).await {
        let proxy = MediaTransport1Proxy::builder(&connection)
            .path(transport_path.as_str())?
            .build()
            .await?;
        
        // Convert 0-100 to 0-127
        let volume_bluez = ((volume as f32 / 100.0) * 127.0) as u16;
        proxy.set_volume(volume_bluez).await?;
        println!("Volume set to {} (BlueZ: {})", volume, volume_bluez);
    } else {
        println!("No media transport found for device: {}", address);
    }
    
    Ok(())
}

fn extract_string_from_variant(map: &HashMap<String, OwnedValue>, key: &str) -> Option<String> {
    map.get(key).and_then(|v| {
        // Try to get string value using TryFrom for reference
        <&str as TryFrom<&OwnedValue>>::try_from(v)
            .ok()
            .map(|s| s.to_string())
    })
}

fn extract_u64_from_variant(map: &HashMap<String, OwnedValue>, key: &str) -> Option<u64> {
    map.get(key).and_then(|v| {
        // Try u32 first (most common for duration in milliseconds)
        if let Ok(n) = <u32 as TryFrom<&OwnedValue>>::try_from(v) {
            Some(n as u64)
        } else if let Ok(n) = <u64 as TryFrom<&OwnedValue>>::try_from(v) {
            Some(n)
        } else {
            None
        }
    })
}
