use tray_icon::{
    menu::{Menu, MenuEvent, MenuItem, PredefinedMenuItem},
    Icon, TrayIcon, TrayIconBuilder, TrayIconEvent,
    MouseButton,
};

const TEAL: [u8; 4] = [13, 148, 136, 255]; // #0d9488

/// Build a 32x32 solid teal square icon with a white "H".
fn build_icon() -> Icon {
    let size = 32u32;
    let mut rgba = vec![0u8; (size * size * 4) as usize];

    for pixel in rgba.chunks_exact_mut(4) {
        pixel.copy_from_slice(&TEAL);
    }

    let white = [255u8, 255, 255, 255];
    for y in 6..26 {
        for x in 9..12 {
            let i = ((y * size + x) * 4) as usize;
            rgba[i..i + 4].copy_from_slice(&white);
        }
    }
    for y in 6..26 {
        for x in 20..23 {
            let i = ((y * size + x) * 4) as usize;
            rgba[i..i + 4].copy_from_slice(&white);
        }
    }
    for y in 14..18 {
        for x in 12..20 {
            let i = ((y * size + x) * 4) as usize;
            rgba[i..i + 4].copy_from_slice(&white);
        }
    }

    Icon::from_rgba(rgba, size, size).expect("failed to create tray icon")
}

pub struct TrayApp {
    _tray: TrayIcon,
    open_id: tray_icon::menu::MenuId,
    copy_url_id: tray_icon::menu::MenuId,
    quit_id: tray_icon::menu::MenuId,
    port: u16,
    network_url: String,
}

impl TrayApp {
    pub fn new(port: u16, local_ip: &str) -> Self {
        let network_url = format!("http://{}:{}", local_ip, port);

        let menu = Menu::new();
        let open_item = MenuItem::new("Mở nextHotel", true, None);
        let copy_url_item = MenuItem::new(
            format!("Copy URL: {}", network_url),
            true,
            None,
        );
        let info_item = MenuItem::new(
            format!("Cổng {} — chia sẻ URL trên cho nhân viên", port),
            false,
            None,
        );
        let quit_item = MenuItem::new("Thoát", true, None);

        let open_id = open_item.id().clone();
        let copy_url_id = copy_url_item.id().clone();
        let quit_id = quit_item.id().clone();

        menu.append(&open_item).unwrap();
        menu.append(&copy_url_item).unwrap();
        menu.append(&info_item).unwrap();
        menu.append(&PredefinedMenuItem::separator()).unwrap();
        menu.append(&quit_item).unwrap();

        let tray = TrayIconBuilder::new()
            .with_tooltip(format!("nextHotel — {}", network_url))
            .with_icon(build_icon())
            .with_menu(Box::new(menu))
            .build()
            .expect("failed to build tray icon");

        Self {
            _tray: tray,
            open_id,
            copy_url_id,
            quit_id,
            port,
            network_url,
        }
    }

    /// Run the Windows message loop. Required for tray context menu to work.
    pub fn run_event_loop(&self) -> ! {
        let menu_rx = MenuEvent::receiver();
        let tray_rx = TrayIconEvent::receiver();

        let open_id = self.open_id.clone();
        let copy_url_id = self.copy_url_id.clone();
        let quit_id = self.quit_id.clone();
        let port = self.port;
        let network_url = self.network_url.clone();

        std::thread::spawn(move || {
            loop {
                if let Ok(event) = tray_rx.try_recv() {
                    if matches!(event, TrayIconEvent::Click { button: MouseButton::Left, .. }) {
                        open_browser(port);
                    }
                }
                if let Ok(event) = menu_rx.try_recv() {
                    if event.id() == &open_id {
                        open_browser(port);
                    } else if event.id() == &copy_url_id {
                        copy_to_clipboard(&network_url);
                    } else if event.id() == &quit_id {
                        std::process::exit(0);
                    }
                }
                std::thread::sleep(std::time::Duration::from_millis(50));
            }
        });

        // Windows message pump — required for tray context menu
        #[cfg(windows)]
        unsafe {
            use std::mem::zeroed;
            #[repr(C)]
            struct MSG {
                hwnd: *mut std::ffi::c_void,
                message: u32,
                w_param: usize,
                l_param: isize,
                time: u32,
                pt_x: i32,
                pt_y: i32,
            }
            extern "system" {
                fn GetMessageW(msg: *mut MSG, hwnd: *mut std::ffi::c_void, min: u32, max: u32) -> i32;
                fn TranslateMessage(msg: *const MSG) -> i32;
                fn DispatchMessageW(msg: *const MSG) -> isize;
            }
            let mut msg: MSG = zeroed();
            loop {
                let ret = GetMessageW(&mut msg, std::ptr::null_mut(), 0, 0);
                if ret <= 0 { break; }
                TranslateMessage(&msg);
                DispatchMessageW(&msg);
            }
        }

        #[cfg(not(windows))]
        loop {
            std::thread::sleep(std::time::Duration::from_secs(1));
        }

        std::process::exit(0);
    }
}

fn open_browser(port: u16) {
    let url = format!("http://127.0.0.1:{}", port);
    #[cfg(windows)]
    let _ = std::process::Command::new("cmd")
        .args(["/C", "start", "", &url])
        .spawn();
    #[cfg(not(windows))]
    let _ = std::process::Command::new("xdg-open").arg(&url).spawn();
}

fn copy_to_clipboard(text: &str) {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        let _ = std::process::Command::new("powershell")
            .args(["-NoProfile", "-Command", &format!("Set-Clipboard '{}'", text)])
            .creation_flags(0x08000000) // CREATE_NO_WINDOW
            .spawn();
    }
}
