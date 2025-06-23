mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            commands::audio::set_system_volume,
            commands::display::set_brightness,
            commands::bluetooth::initialize_bluetooth,
            commands::bluetooth::start_bluetooth_discovery,
            commands::bluetooth::stop_bluetooth_discovery,
            commands::bluetooth::get_bluetooth_devices,
            commands::bluetooth::refresh_bluetooth_devices,
            commands::bluetooth::pair_bluetooth_device,
            commands::bluetooth::unpair_bluetooth_device,
            commands::bluetooth::connect_bluetooth_device,
            commands::bluetooth::disconnect_bluetooth_device,
            commands::bluetooth::get_bluetooth_audio_sinks,
            commands::bluetooth::get_bluetooth_status
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
