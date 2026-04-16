# Xử lý sự cố

Các vấn đề thường gặp và cách xử lý. Khi không tự giải quyết được, báo quản lý / giám đốc / IT.

## Kết nối & đăng nhập

### Banner đỏ "Mất kết nối đến máy chủ" ở trên cùng

**Nguyên nhân có thể:**
- PC máy chủ đang tắt.
- Máy chủ đã bị tắt ứng dụng (đóng cửa sổ console).
- Mất wifi.
- IP máy chủ đã đổi.

**Cách xử lý:**
1. Kiểm tra PC máy chủ có đang bật không.
2. Nhìn cửa sổ console của máy chủ — có đang chạy không.
3. Nếu đóng → double-click `nexthotel-server.exe` để mở lại.
4. Kiểm tra thiết bị của bạn có đang kết nối wifi không.
5. Nếu tất cả đúng mà vẫn mất kết nối → báo IT, có thể IP máy chủ đã đổi.

### "Sai tên đăng nhập hoặc PIN"

- Gõ lại, chú ý phân biệt chữ hoa/thường trong tên đăng nhập.
- Caps Lock có đang bật không?
- Vẫn sai → hỏi giám đốc reset PIN.

### "Tài khoản đã bị khoá"

Tài khoản bị giám đốc khoá. Hỏi giám đốc để kích hoạt lại nếu cần.

### Không đăng nhập được, không có thông báo gì

- Xem banner đỏ "Mất kết nối" — có thể máy chủ đang tắt.
- Thử refresh trình duyệt (F5).
- Thử trình duyệt khác.

## Đặt phòng

### "Phòng đã được đặt từ X đến Y (khách: ...)"

Phòng đang bị trùng với đặt phòng khác trong khoảng ngày đó.

**Cách xử lý:**
- Chọn **phòng khác**.
- Hoặc chọn **ngày khác**.
- Nếu chắc chắn là trùng nhầm: mở lịch tìm đặt phòng kia, xem nó đúng không. Có thể
  ai đó ghi nhầm.

### "Ngày trả phòng phải sau ngày nhận phòng"

Kiểm tra lại 2 ô ngày. Ngày trả phải ít nhất là ngày hôm sau của ngày nhận.

### "Chưa chọn khách" khi lưu đặt phòng

Ở ô tìm khách, bạn chưa bấm chọn từ danh sách dropdown, mà chỉ gõ tên. Gõ tên → dropdown
hiện → **bấm chọn** tên khách.

### Giá hiện không đúng khi tạo đặt phòng

Hệ thống tự tính giá/đêm từ giá mùa vụ. Nếu giá sai:
- Kiểm tra **Loại phòng** của phòng đó (Cài đặt → Phòng).
- Kiểm tra **Giá mùa vụ** áp dụng cho loại đó và ngày đó (Cài đặt → Giá mùa vụ).
- Bạn có thể **nhập đè giá thủ công** vào ô giá trong form đặt phòng.

### Không bấm được "Nhận phòng"

Nút chỉ hiện khi trạng thái là **Đã xác nhận**. Nếu đã là "Đang ở" nghĩa là đã nhận rồi.
Nếu là "Đã huỷ" hoặc "Đã trả phòng" thì không xử lý được nữa.

### Không thể sửa đặt phòng

Đặt phòng ở trạng thái **Đã trả phòng** hoặc **Đã huỷ** không sửa được (quy định hệ thống).
Tạo đặt phòng mới nếu cần.

### "Phải trả phòng trước khi huỷ"

Khách đã nhận phòng, không huỷ được. Cần **Trả phòng** trước, rồi có thể tạo ghi chú / xử
lý riêng.

### "Khách này đang trong danh sách đen" banner đỏ

Khách đã bị đánh dấu trước đó. Hỏi quản lý trước khi tiếp nhận.

## Thanh toán & dịch vụ

### "Số tiền phải lớn hơn 0"

Đang nhập số 0 hoặc rỗng. Nhập số hợp lệ.

### Thanh toán đã ghi nhưng trạng thái vẫn "Chưa thanh toán"

Refresh trang (F5). Nếu vẫn vậy — kiểm tra xem thanh toán đã lưu chưa (xem danh sách
thanh toán phía dưới).

### Tổng tiền không khớp với tiền phòng

Có thể khách có **dịch vụ phát sinh** (minibar, giặt ủi, vv) đã cộng vào. Xem mục **Dịch
vụ phát sinh** trong khay trượt.

### Ghi nhầm thanh toán / dịch vụ — muốn xoá

**Dịch vụ phát sinh**: quản lý+ có nút thùng rác trong mục đó.

**Thanh toán**: hiện tại không có nút xoá trong UI v1. Cách xử lý:
- Ghi thêm một thanh toán âm để bù trừ (yêu cầu thay đổi code nhỏ — báo IT).
- Hoặc IT sửa trực tiếp database.

## Buồng phòng

### Phòng vẫn hiện "Bẩn" sau khi dọn

Sau khi dọn thực tế, cần **vào app → Buồng phòng → bấm phòng → Đánh dấu sạch**. Hệ thống
không tự biết bạn đã dọn.

### Ô phòng hiển thị sai khách / sai ngày trả

Thông tin này pull từ đặt phòng đang ở trạng thái "Đang ở". Kiểm tra đặt phòng của phòng đó.

### Máy tính bảng chậm / giật

- Refresh trang.
- Nếu dùng tablet cũ → hạn chế mở nhiều tab cùng lúc.
- Tắt các app khác đang chạy trên tablet.

## Báo cáo

### Báo cáo hiện "—" ở tất cả KPI

Không có dữ liệu trong khoảng thời gian đang chọn. Thử chọn khoảng thời gian khác.

### Doanh thu không khớp với hoá đơn đã in

Hệ thống tính **doanh thu theo ngày thanh toán**, không phải ngày nhận phòng. Nếu khách
thanh toán sau 3 ngày, doanh thu đó sẽ xuất hiện ở ngày thanh toán. Điều này đúng theo
nguyên tắc kế toán.

### RevPAR thấp mà ADR cao

Nghĩa là công suất thấp. Giá đang cao quá → khách ít, phòng nhiều trống.

### RevPAR thấp mà công suất cao

Giảm giá quá sâu. Bán được nhiều phòng nhưng doanh thu/phòng thấp.

## Kết sổ cuối ngày

### "Ngày này đã được kết sổ"

Đã kết sổ rồi, không chạy lại được. Có thể xem kết quả trong **Lịch sử kết sổ** phía dưới.

### Cảnh báo vàng: "N đặt phòng chưa thanh toán đầy đủ"

Trước khi kết sổ, giải quyết các đặt phòng này:
1. Vào Lịch.
2. Tìm các đặt phòng trạng thái "Đã trả phòng" mà chưa thanh toán đủ.
3. Liên hệ khách để thu hoặc ghi nhận thanh toán.

Nếu chấp nhận còn tồn đọng → vẫn chạy kết sổ được, nhưng nên ghi chú rõ.

### Cảnh báo: "N phòng chưa dọn"

Bảo lễ tân / buồng phòng dọn. Hoặc sáng hôm sau dọn rồi kết sổ.

## Sao lưu

### "Sao lưu thất bại"

Nguyên nhân có thể:
- Ổ đĩa đầy.
- Thư mục sao lưu không có quyền ghi.
- File đang được mở bởi app khác.

Báo IT.

### Không thấy file sao lưu trong thư mục

Kiểm tra đường dẫn thư mục dữ liệu (Cài đặt → Sao lưu, có hiện đường dẫn). Sao lưu nằm
trong thư mục con `backups`.

## Cài đặt

### Không bấm được mục nào trong menu bên trái

Tài khoản không có quyền. Đăng nhập bằng tài khoản có quyền cao hơn (quản lý hoặc giám đốc).

### Thay đổi trong Cài đặt không có tác dụng

Refresh trang (F5). Nếu vẫn không thấy — có thể chưa bấm **Lưu**.

## In hoá đơn

### In ra không có thông tin khách sạn

Chưa điền đầy đủ trong **Cài đặt → Thông tin khách sạn**. Giám đốc cần cập nhật.

### Hoá đơn lệch / đứt chữ

- Trong hộp thoại Print, chọn đúng **khổ giấy A5 dọc** (Portrait).
- Hoặc chọn "Fit to page" trong tuỳ chọn in.

### Máy in không hoạt động

- Kiểm tra máy in đã bật chưa.
- Kiểm tra trong Windows → Devices → Printers có máy in của bạn không.
- Có thể cần cài driver máy in trên PC lễ tân.

## Hiệu năng

### App chậm, giật

- Refresh trang (F5).
- Thử trình duyệt khác (Chrome / Edge).
- Số lượng đặt phòng quá lớn (>10.000)? Báo IT — cần tối ưu query.

### Ô Lịch hiện không đúng màu

- Refresh trang.
- Nếu lỗi vẫn còn → báo IT với ảnh chụp màn hình.

## Khi báo IT

Chuẩn bị trước các thông tin sau để IT xử lý nhanh:

1. **Mô tả vấn đề** — làm gì thì lỗi xảy ra.
2. **Thông báo lỗi** — chụp ảnh màn hình.
3. **Thiết bị nào** — PC lễ tân / máy tính bảng / máy chủ.
4. **Tài khoản nào** đang đăng nhập.
5. **Thời gian xảy ra** — lúc nào.
6. **Đã thử gì** — refresh, đăng xuất rồi đăng nhập lại, vv.
