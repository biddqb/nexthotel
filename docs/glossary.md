# Thuật ngữ

Từ điển nhanh các thuật ngữ dùng trong nextHotel.

## Thuật ngữ khách sạn

### ADR — Average Daily Rate (Giá phòng trung bình)
Giá trung bình của một đêm phòng **đã bán**.
**Công thức**: Doanh thu ÷ Số phòng-đêm đã bán.
Ví dụ: bán 100 phòng-đêm, thu 50 triệu → ADR = 500.000đ/đêm.

### RevPAR — Revenue Per Available Room (Doanh thu / phòng có sẵn)
Doanh thu trung bình trên mỗi phòng trong khách sạn, **kể cả phòng trống**.
**Công thức**: Doanh thu ÷ Tổng phòng-đêm. Hoặc: ADR × Công suất.
**Quan trọng hơn ADR** vì phản ánh cả giá và lấp đầy phòng.

### Công suất (Occupancy)
Tỉ lệ phòng được sử dụng = Phòng-đêm đã bán ÷ Tổng phòng-đêm có sẵn.
Ví dụ: 31 phòng × 30 ngày = 930 phòng-đêm; bán 600 → công suất = 64.5%.

### Phòng-đêm (Room-night)
Đơn vị đo "một phòng cho một đêm". 31 phòng trong 30 ngày = 930 phòng-đêm.

### Folio
Hoá đơn lũy kế của một khách — gồm tiền phòng + tất cả dịch vụ phát sinh.

### Night audit (Kết sổ cuối ngày)
Quy trình cuối ngày: chốt doanh thu, công suất, phát hiện việc còn tồn, **khoá ngày**
để không còn sửa được nữa.

### Walk-in
Khách đến bất ngờ, không đặt phòng trước.

### Giá mùa vụ (Rate plan)
Luật định giá theo khoảng thời gian + loại phòng. Ví dụ "giá hè", "giá lễ 2/9".

### Giá cơ bản (Base rate)
Giá mặc định của phòng, dùng khi không có giá mùa vụ nào khớp.

### Danh sách đen (Blacklist)
Khách bị đánh dấu (không thanh toán, gây rối, vv). Hệ thống cảnh báo khi tiếp nhận.

### Dịch vụ phát sinh (Ancillary charge)
Khoản tiền khách phát sinh khi ở: minibar, giặt ủi, ăn uống, vv. Cộng vào folio.

## Thuật ngữ trạng thái

### Đặt phòng (Reservation)

| Trạng thái | Ý nghĩa |
|---|---|
| **Đã xác nhận** | Đã tạo, chờ khách đến |
| **Đang ở** | Khách đã nhận phòng |
| **Đã trả phòng** | Khách đã trả, hoàn tất |
| **Đã huỷ** | Bị huỷ trước khi nhận phòng |
| **Không đến** | Khách không đến nhận phòng |

### Thanh toán (Payment status)

| Trạng thái | Ý nghĩa |
|---|---|
| **Chưa thanh toán** | Chưa trả đồng nào |
| **Đã đặt cọc** | Mới trả một phần |
| **Đã thanh toán** | Trả đủ folio |
| **Đã hoàn tiền** | Đã hoàn lại khách |

### Buồng phòng (Housekeeping state)

| Trạng thái | Ý nghĩa |
|---|---|
| **Sạch** | Sẵn sàng đón khách |
| **Bẩn** | Cần dọn |
| **Đã kiểm tra** | Đã dọn + quản lý đã duyệt |
| **Đang bảo trì** | Có hư hỏng, đang sửa |
| **Ngưng sử dụng** | Không cho thuê |

## Thuật ngữ hệ thống

### Máy chủ (Server)
PC cài nextHotel, lưu toàn bộ dữ liệu. Phải luôn bật.

### LAN (mạng nội bộ)
Mạng wifi trong hotel. nextHotel chạy trên LAN, không dùng Internet bên ngoài.

### IP (địa chỉ máy chủ)
Dãy số kiểu `192.168.1.100` — "địa chỉ" của PC máy chủ trên mạng LAN.

### Port 8080
"Cổng" máy chủ đang lắng nghe. URL đầy đủ là `http://192.168.x.x:8080`.

### PIN
4–12 chữ số dùng thay mật khẩu. Đơn giản hơn cho nhân viên lớn tuổi.

### Session (Phiên)
Lần đăng nhập — kéo dài 30 ngày trên 1 thiết bị + trình duyệt.

### Vai trò (Role)

| Vai trò | Tiếng Anh | Quyền |
|---|---|---|
| **Lễ tân / Buồng phòng** | Staff | Vận hành hàng ngày |
| **Quản lý** | Manager | Cộng báo cáo, chi phí, giá mùa vụ, kết sổ |
| **Giám đốc** | Director | Cộng quản lý tài khoản, thông tin hotel, lịch sử |

### Sao lưu (Backup)
Bản sao dữ liệu tại một thời điểm. Khi máy chủ hỏng có thể khôi phục lại.

### VACUUM INTO
Lệnh SQLite an toàn để sao lưu database đang chạy. nextHotel dùng lệnh này tự động.

## Thuật ngữ tiền tệ

### VND / ₫
Đồng Việt Nam. Hệ thống lưu tiền dưới dạng **số nguyên đồng**, không có số lẻ.
Hiển thị kiểu `1.500.000 ₫`.

### Cọc (Deposit)
Khoản trả trước khi đặt phòng. Được tính vào folio, trừ ra khỏi "Còn lại".

### Folio total
Tổng tiền của đặt phòng = Tiền phòng + Dịch vụ phát sinh.

### Còn lại (Remaining)
= Folio total − Đã trả. Số tiền khách còn nợ.
