# Hướng dẫn Giám đốc / Chủ khách sạn

Tài liệu đầy đủ nhất. Bao gồm:
- Cài đặt hệ thống lần đầu trên PC chủ.
- Thiết lập ban đầu (wizard 3 bước).
- Quản lý tài khoản nhân viên.
- Giám sát hoạt động toàn hệ thống.

**Trước tiên**, hãy đọc [Hướng dẫn Quản lý](./manager.md). Giám đốc làm được tất cả những
gì quản lý làm, cộng thêm các việc trong tài liệu này.

## Mục lục

1. [Cài đặt máy chủ lần đầu](#1-cài-đặt-máy-chủ-lần-đầu)
2. [Thiết lập ban đầu (First-run Wizard)](#2-thiết-lập-ban-đầu-first-run-wizard)
3. [Kết nối các thiết bị staff vào máy chủ](#3-kết-nối-các-thiết-bị-staff-vào-máy-chủ)
4. [Quản lý tài khoản nhân viên](#4-quản-lý-tài-khoản-nhân-viên)
5. [Thông tin khách sạn (xuất hiện trên hoá đơn)](#5-thông-tin-khách-sạn-xuất-hiện-trên-hoá-đơn)
6. [Giám sát & lịch sử hoạt động](#6-giám-sát--lịch-sử-hoạt-động)
7. [Kế hoạch hàng tháng & hàng năm](#7-kế-hoạch-hàng-tháng--hàng-năm)
8. [Bảo trì và nâng cấp](#8-bảo-trì-và-nâng-cấp)
9. [Phục hồi khi sự cố](#9-phục-hồi-khi-sự-cố)

---

## 1. Cài đặt máy chủ lần đầu

Chỉ làm **một lần** trên PC sẽ đóng vai trò máy chủ (thường là PC để cố định ở quầy lễ tân
hoặc phòng giám đốc). Máy này **phải luôn bật**.

### Yêu cầu

- Windows 10 hoặc 11.
- PC có thể để bật 24/7 (máy bàn tốt hơn laptop).
- Wifi nội bộ ổn định.
- Ổ cứng còn trống tối thiểu 2 GB.
- Chuột, bàn phím, màn hình.

### Cài đặt môi trường (chỉ lần đầu)

Cần cài 2 công cụ để build ứng dụng:

**Bước 1 — Cài Node.js và Bun:**
1. Vào https://bun.sh → làm theo hướng dẫn cài đặt trên Windows (chạy PowerShell gõ lệnh).
2. Mở Command Prompt mới, gõ `bun --version`. Nếu hiện số phiên bản → đã cài xong.

**Bước 2 — Cài Rust (ngôn ngữ lập trình của backend):**
1. Vào https://rustup.rs → tải installer → chạy.
2. Chọn option 1 (mặc định).
3. Đợi 3–5 phút.
4. Mở Command Prompt mới, gõ `cargo --version`. Nếu hiện phiên bản → đã cài xong.

**Bước 3 — Copy thư mục `app/` vào PC:**
- Copy toàn bộ thư mục `app` (chứa code của nextHotel) vào PC, vd: `C:\nextHotel\app`.

### Build ứng dụng

1. Mở File Explorer, vào thư mục `app` đã copy.
2. Double-click file **`build-release.cmd`**.
3. Một cửa sổ Command Prompt hiện ra. Đợi 5–15 phút (lần đầu chậm vì tải ~500 thư viện).
4. Khi thấy thông báo **"Build complete"** → đã xong.

File kết quả: `app\src-tauri\target\release\nexthotel-server.exe` (khoảng 30–40 MB).

### Chạy thử

1. Double-click `nexthotel-server.exe`.
2. Một biểu tượng **H** màu teal xuất hiện trong **khay hệ thống** (góc phải dưới màn hình,
   gần đồng hồ). Ứng dụng chạy nền, không có cửa sổ console.
3. **Nhấp chuột phải** vào biểu tượng H để xem menu:
   - **Mở nextHotel** — mở ứng dụng trong trình duyệt.
   - **Copy URL: http://192.168.x.x:8080** — bấm để sao chép địa chỉ mạng. Đây là địa chỉ
     các thiết bị khác dùng để truy cập.
   - **Thoát** — tắt máy chủ.
4. **Nhấp chuột trái** vào biểu tượng H → mở trình duyệt ngay.
5. Di chuột qua biểu tượng H → hiện tooltip với địa chỉ mạng đầy đủ.

Để tắt máy chủ: nhấp chuột phải → **Thoát**.

### Thiết lập tự động chạy khi bật máy

Để khỏi phải mở thủ công mỗi sáng:

1. Trong thư mục `app`, double-click **`install-autostart.cmd`**.
2. Thông báo **"Installed. nextHotel will start on next Windows login"** → xong.
3. Restart Windows để kiểm tra.

Muốn bỏ tự chạy: double-click **`uninstall-autostart.cmd`**.

### Cấu hình tường lửa / diệt virus

- Khi chạy lần đầu, Windows hỏi **"Allow nextHotel-server to communicate on private network"** → chọn **Allow**.
- Nếu dùng diệt virus khác (Kaspersky, BitDefender, vv) → có thể cần thêm `nexthotel-server.exe` vào allow-list.

### Cấu hình router / wifi

Để các thiết bị khác vào được, chúng phải cùng mạng wifi nội bộ với PC server.

- **PC server dùng dây LAN** (khuyên dùng) — ổn định hơn wifi.
- **Đặt IP tĩnh cho PC server** (tuỳ chọn, nâng cao) — để IP không đổi sau restart router.
  Cách đặt: trong router, tìm mục **DHCP Reservation** → gán IP cố định cho MAC address
  của PC server.

---

## 2. Thiết lập ban đầu (First-run Wizard)

Khi mở ứng dụng lần đầu, hệ thống bắt bạn điền 3 bước.

### Bước 1 — Thông tin khách sạn

Nhập:
- **Tên khách sạn** — xuất hiện trên hoá đơn.
- **Địa chỉ** — tuỳ chọn.
- **Mã số thuế** — nếu có, xuất hiện trên hoá đơn.
- **Số điện thoại** — xuất hiện trên hoá đơn.

Bấm **Tiếp**.

### Bước 2 — Thêm phòng

Nhập:
- **Số phòng đơn** — ví dụ 23.
- **Số phòng đôi** — ví dụ 8.
- **Tiền tố số phòng** — nếu phòng đánh số kiểu `101, 102, ...` → không cần điền.
  Nếu kiểu `A1, A2, ...` → điền `A`.
- **Bắt đầu từ số** — ví dụ `101`.
- **Giá cơ bản / đêm** — giá mặc định, có thể sửa từng phòng sau.

Hệ thống sẽ tự tạo số phòng cho bạn, các phòng đơn trước, rồi các phòng đôi. Bạn có thể
sửa loại phòng và giá của từng phòng sau.

Bấm **Tiếp**.

### Bước 3 — Tài khoản quản trị

Tạo tài khoản đầu tiên. Tài khoản này có vai trò **Giám đốc** (quyền cao nhất).

- **Tên đăng nhập** — ví dụ `admin` hoặc tên của bạn.
- **PIN** — 4–12 chữ số.
- **Xác nhận PIN** — nhập lại để chắc chắn.

Bấm **Hoàn tất**.

Màn hình chuyển sang Lịch đặt phòng. Sẵn sàng dùng.

---

## 3. Kết nối các thiết bị staff vào máy chủ

Sau khi máy chủ chạy, các thiết bị khác (PC lễ tân, máy tính bảng dọn phòng, laptop giám đốc)
đều truy cập qua trình duyệt.

### Trên từng thiết bị staff

1. **Kết nối cùng wifi** với PC server.
2. **Mở trình duyệt** (Chrome / Edge / Safari).
3. **Gõ Network URL** từ cửa sổ console của server, ví dụ: `http://192.168.1.100:8080`.
4. **Thêm vào bookmark** / thêm vào Home Screen của máy tính bảng để lần sau mở nhanh.

### Máy tính bảng dọn phòng

- Dùng **iPad** hoặc tablet Android hoặc Windows tablet — đều được.
- Kích thước 10 inch trở lên sẽ thoải mái.
- Đăng nhập bằng tài khoản staff.

### Gợi ý đặt tên PIN

- PIN ngắn (4 số) tiện cho nhân viên lớn tuổi.
- **Không dùng PIN dễ đoán**: `1234`, `0000`, ngày sinh.
- **Không dùng chung PIN** — mỗi nhân viên 1 PIN riêng để lịch sử hoạt động phân biệt được ai làm gì.

---

## 4. Quản lý tài khoản nhân viên

Vào **Cài đặt → Tài khoản** (chỉ giám đốc thấy mục này).

### Tạo tài khoản mới

1. Bấm **+ Thêm tài khoản**.
2. Điền:
   - **Tên đăng nhập** — ví dụ `le-tan-1`, `quan-ly-hoa`.
   - **Vai trò**:
     - **Lễ tân / Buồng phòng** — làm việc hàng ngày.
     - **Quản lý** — cộng thêm báo cáo, chi phí, giá mùa vụ, kết sổ, sao lưu.
     - **Giám đốc** — cộng thêm quản lý tài khoản, thông tin khách sạn, lịch sử hoạt động.
   - **PIN** và **xác nhận PIN**.
3. Bấm **Lưu**.

### Sửa tài khoản

Bấm biểu tượng bút trên dòng tài khoản:
- Đổi tên đăng nhập.
- Đổi vai trò (ví dụ: nâng lễ tân lên quản lý).
- Kích hoạt / khoá.
- **PIN mới** — để trống nếu không đổi. Dùng khi nhân viên quên PIN.

### Khoá tài khoản

Khi nhân viên nghỉ:
1. Vào **Cài đặt → Tài khoản** → bấm bút trên dòng đó.
2. Bỏ tích **Kích hoạt**.
3. **Lưu**.

Tài khoản không đăng nhập được nữa, nhưng dữ liệu lịch sử vẫn còn (để biết ai đã làm gì ngày đó).

### Nguyên tắc về tài khoản

- **1 người = 1 tài khoản.** Không dùng chung.
- **Giám đốc nên có ít nhất 2 tài khoản giám đốc** (ví dụ: bạn + một người tin cậy khác)
  để có dự phòng khi bạn quên PIN hoặc bận.
- **Quản lý không được tự tạo tài khoản** — chỉ giám đốc làm.
- Khi nhân viên quên PIN, không có cách khôi phục PIN cũ. Giám đốc phải đặt PIN mới.

---

## 5. Thông tin khách sạn (xuất hiện trên hoá đơn)

Vào **Cài đặt → Thông tin khách sạn**.

Các trường:
- **Tên khách sạn** — tiêu đề lớn trên hoá đơn.
- **Địa chỉ**.
- **Mã số thuế** — in dưới tên.
- **Số điện thoại**.

Sửa xong bấm **Lưu**. Hoá đơn in ra sẽ dùng thông tin mới ngay.

---

## 6. Giám sát & lịch sử hoạt động

Giám đốc có quyền xem toàn bộ lịch sử để theo dõi hoạt động hệ thống.

### Lịch sử hoạt động (audit log)

Vào **Cài đặt → Lịch sử hoạt động** (cuối trang).

Hiển thị các sự kiện trên đặt phòng: tạo / huỷ / nhận phòng / trả phòng. Mỗi sự kiện có
thời gian và ID đặt phòng.

Dùng để:
- Kiểm tra nếu có đặt phòng bị sửa / huỷ bất thường.
- Đối chiếu khi khách phàn nàn ("tôi đặt phòng lúc đó rồi mà").

### Lịch sử ca làm

Vào **Cài đặt → Lịch sử ca**.

Xem tất cả ca làm: ai làm, giờ vào, giờ kết, số giờ, ghi chú bàn giao.

Dùng để:
- Chấm công / tính lương.
- Kiểm tra ca nào đang làm.
- Đọc ghi chú cũ.

### Lịch sử buồng phòng

Vào **Buồng phòng → Lịch sử** (nút trên thanh).

Xem ai đã đánh dấu phòng nào, trạng thái gì, khi nào. Dùng để:
- Đối chiếu khi khách phàn nàn phòng chưa dọn.
- Phát hiện nhân viên không cập nhật trạng thái đều đặn.

### Kết sổ đã chạy

Vào **Cài đặt → Kết sổ cuối ngày** → cuộn xuống phần **Lịch sử kết sổ**.

Liệt kê các ngày đã kết sổ: doanh thu, công suất, ADR, ai kết, lúc nào, ghi chú.

---

## 7. Kế hoạch hàng tháng & hàng năm

### Hàng tháng

- [ ] Xem báo cáo **Tháng trước** — ADR, RevPAR, công suất, số đặt phòng.
- [ ] So với cùng kỳ năm trước (nếu có dữ liệu).
- [ ] Xem tổng chi phí tháng.
- [ ] Tính sơ bộ lợi nhuận = Doanh thu − Chi phí − Lương.
- [ ] Kiểm tra danh sách tài khoản — có ai không dùng nữa cần khoá.
- [ ] Tạo sao lưu thủ công, copy ra USB / đĩa cứng ngoài.

### Hàng quý

- [ ] Điều chỉnh giá mùa vụ cho quý tới.
- [ ] Xem biến động RevPAR để ra quyết định tăng/giảm giá.
- [ ] Kiểm tra danh sách đen — có khách nào xoá được khỏi đó không.

### Hàng năm

- [ ] Sao lưu toàn bộ dữ liệu ra ổ cứng ngoài + upload lên cloud cá nhân.
- [ ] Cập nhật ứng dụng lên phiên bản mới (nếu có).
- [ ] Xem lại danh sách phòng, cập nhật loại phòng / giá cơ bản nếu đã tân trang.

---

## 8. Bảo trì và nâng cấp

### Cập nhật ứng dụng khi có phiên bản mới

Ứng dụng **tự kiểm tra bản cập nhật** mỗi khi mở. Khi có phiên bản mới:

1. Một thông báo hiện ở **góc phải dưới** màn hình: *"Phiên bản mới X.Y.Z"*.
2. Bấm **Cập nhật ngay**.
3. Ứng dụng tự tải file mới, tự thay thế, và **tự khởi động lại**. Không cần làm gì thêm.

Dữ liệu khách, phòng, đặt phòng không bị ảnh hưởng — chỉ phần mềm được cập nhật.

**Nếu cập nhật tự động không hoạt động** (mất internet, lỗi tải):
1. Tải file `nexthotel-server.exe` mới từ link IT cung cấp.
2. Tắt máy chủ (nhấp chuột phải biểu tượng H → **Thoát**).
3. Copy file mới ghi đè file cũ.
4. Double-click để chạy lại.

### Giám sát sức khoẻ PC server

- Đảm bảo ổ đĩa không đầy (ứng dụng cần khoảng 500 MB).
- Khởi động lại Windows định kỳ (1 lần / tuần) — chạy Windows Update.
- Quét virus định kỳ.

### Dự phòng nguồn điện (khuyên dùng)

Mua một **UPS** (bộ lưu điện) cho PC server. Giá khoảng 1–2 triệu. Khi cúp điện, PC vẫn
chạy được 10–30 phút → kịp thời tắt an toàn hoặc chờ điện về.

---

## 9. Phục hồi khi sự cố

### PC server hỏng hoàn toàn

1. Lấy file **`nexthotel-*.sqlite`** mới nhất từ thư mục sao lưu (hoặc từ cloud drive nếu
   đã cấu hình).
2. Tải file `nexthotel-server.exe` từ link IT cung cấp, đặt vào PC thay thế.
3. Trước khi chạy lần đầu, **copy file `.sqlite` đó vào thư mục dữ liệu** và **đổi tên
   thành `nexthotel.db`**.
4. Chạy ứng dụng. Tất cả dữ liệu được khôi phục.

### Quên PIN giám đốc

Nếu bạn là giám đốc duy nhất mà quên PIN → không đăng nhập được:
1. Nhờ người có quyền admin Windows mở thư mục dữ liệu.
2. Xoá file `nexthotel.db` (sau khi đã copy nó ra chỗ khác làm backup!).
3. Chạy ứng dụng → Wizard thiết lập lại sẽ bật.
4. Bước khẩn cấp khác: vì backup file là SQLite, IT có thể mở bằng **DB Browser for SQLite**
   và sửa trực tiếp `pin_hash` của user của bạn (cần kiến thức kỹ thuật).

**Đó là lý do phải có ít nhất 2 tài khoản giám đốc.**

### Dữ liệu bị lỗi / mất đặt phòng

1. Dừng máy chủ.
2. Khôi phục từ file sao lưu gần nhất (copy đè `nexthotel.db`).
3. Chạy lại.

Có thể mất một ít dữ liệu của ngày cuối nếu chưa kịp sao lưu. Đó là lý do nên chạy sao
lưu thủ công trước các thao tác lớn.

### Tất cả thiết bị mất kết nối

- Kiểm tra PC server có đang chạy không (nhìn cửa sổ console).
- Kiểm tra wifi của PC server.
- Kiểm tra wifi của các thiết bị staff.
- Nếu IP của PC server thay đổi → các thiết bị phải gõ lại địa chỉ mới (gỡ bookmark cũ).

---

## Danh sách kiểm tra cho giám đốc mới

Nếu bạn mới tiếp quản vị trí giám đốc:

- [ ] Đọc hết hướng dẫn này.
- [ ] Đọc [Hướng dẫn Quản lý](./manager.md) và [Hướng dẫn Lễ tân](./staff.md).
- [ ] Đăng nhập bằng tài khoản giám đốc cũ (hoặc tạo tài khoản giám đốc mới của bạn).
- [ ] Xem tài khoản nhân viên hiện có. Có ai nên khoá?
- [ ] Xem báo cáo 3 tháng gần nhất — nắm xu hướng.
- [ ] Xem danh sách chi phí 3 tháng gần nhất.
- [ ] Xem lịch sử hoạt động — có gì bất thường không.
- [ ] Kiểm tra máy chủ có đang tự khởi động khi bật máy không.
- [ ] Kiểm tra sao lưu có chạy không (vào Cài đặt → Sao lưu, xem có file gần đây không).
- [ ] Tạo sao lưu thủ công lưu ra USB — để có dữ liệu riêng cho mình.

---

## Liên hệ IT khi cần

Các việc sau cần kiến thức kỹ thuật — báo IT:
- Máy chủ không khởi động được.
- Không build được ứng dụng.
- Cần sửa trực tiếp trong database (xoá dòng thanh toán bị trùng, khôi phục PIN đã mất, vv).
- Muốn truy cập từ ngoài hotel (qua Internet) — hiện tại chỉ chạy LAN, cần cấu hình thêm.
