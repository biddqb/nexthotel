# Hướng dẫn Lễ tân / Buồng phòng

Tài liệu này dành cho nhân viên lễ tân kiêm buồng phòng. Đọc hết một lần (khoảng 15 phút),
rồi dùng làm sổ tay tra cứu khi cần.

## Mục lục

1. [Đăng nhập](#1-đăng-nhập)
2. [Mở và kết ca làm](#2-mở-và-kết-ca-làm)
3. [Màn hình Lịch đặt phòng](#3-màn-hình-lịch-đặt-phòng)
4. [Tạo đặt phòng mới](#4-tạo-đặt-phòng-mới)
5. [Nhận phòng (check-in)](#5-nhận-phòng-check-in)
6. [Ghi nhận thanh toán](#6-ghi-nhận-thanh-toán)
7. [Thêm dịch vụ phát sinh](#7-thêm-dịch-vụ-phát-sinh)
8. [Trả phòng (check-out)](#8-trả-phòng-check-out)
9. [Huỷ đặt phòng](#9-huỷ-đặt-phòng)
10. [In hoá đơn](#10-in-hoá-đơn)
11. [Quản lý khách](#11-quản-lý-khách)
12. [Buồng phòng (trên máy tính bảng)](#12-buồng-phòng-trên-máy-tính-bảng)
13. [Những lỗi thường gặp](#13-những-lỗi-thường-gặp)

---

## 1. Đăng nhập

1. Mở trình duyệt web (Chrome, Edge, hoặc trình duyệt trên máy tính bảng).
2. Gõ địa chỉ server (quản lý sẽ cho bạn, ví dụ `http://192.168.1.100:8080`).
3. Nhập **Tên đăng nhập** (ví dụ: `le-tan-1`).
4. Nhập **mã PIN** của bạn (4–12 chữ số).
5. Bấm **Đăng nhập**.

Nếu báo sai tên đăng nhập hoặc PIN → kiểm tra lại. Nếu vẫn sai → hỏi quản lý / giám đốc để reset PIN.

---

## 2. Mở và kết ca làm

### Mở ca (khi bạn bắt đầu làm việc)

1. Ở thanh bên trái (dưới cùng), bấm nút **Mở ca**.
2. Nút chuyển thành một chấm xanh **Đang trong ca**. Vậy là xong.

### Kết ca (khi bạn hết giờ)

1. Ở thanh bên trái, bấm vào chấm xanh **Đang trong ca**.
2. Một cửa sổ mở ra, điền **Ghi chú bàn giao** cho ca sau:
   - Ví dụ: *"Phòng 203 vòi nước yếu, đã báo bảo trì. Khách phòng 305 sẽ về sớm mai 6h."*
3. Bấm **Kết thúc ca**.

Ghi chú bàn giao giúp người vào ca tiếp theo không bỏ sót gì. Quản lý đọc được.

---

## 3. Màn hình Lịch đặt phòng

Đây là màn hình bạn mở đầu tiên mỗi ngày.

### Bố cục

- **Thanh trên cùng**: nút **‹ ›** chuyển tuần/tháng, nút **Hôm nay**, công tắc **Tuần / Tháng**, nút **+ Đặt phòng mới**.
- **Lưới chính**: mỗi dòng là 1 phòng, mỗi cột là 1 ngày. Ô màu đậm = có khách, ô trắng = phòng trống.
- **Thanh bên phải**: Công suất hôm nay, **Khách nhận phòng hôm nay**, **Khách trả phòng hôm nay**.

### Màu sắc đặt phòng

| Màu | Ý nghĩa |
|---|---|
| Xám xanh đậm | Đã xác nhận, chờ nhận phòng |
| Xanh lá | Khách đang ở (đã nhận phòng) |
| Xám nhạt | Khách đã trả phòng |
| Đỏ gạch ngang | Đã huỷ |
| Cam | Không đến |

**Chấm tròn nhỏ** ở góc phải mỗi thanh đặt phòng:
- Chấm đầy trắng = đã thanh toán đủ
- Chấm viền trắng = mới đặt cọc, còn nợ
- Không có chấm = chưa thanh toán gì

### Chế độ xem

- **Tuần** (mặc định): 7 ngày, ô to, nhìn rõ thông tin từng đặt phòng (tên khách, SĐT, giá/đêm, tình trạng thanh toán).
- **Tháng**: 28–31 ngày, ô nhỏ, nhìn tổng quát cả tháng.

Bấm công tắc **Tuần / Tháng** ở thanh trên để đổi.

---

## 4. Tạo đặt phòng mới

### Cách 1 — Khách đã đặt trước qua điện thoại

1. Ở Lịch, bấm nút **+ Đặt phòng mới** (phía trên bên phải).
2. **Phần 1 — Phòng & ngày**:
   - Chọn phòng.
   - Chọn **Ngày nhận phòng** và **Ngày trả phòng**.
   - Số đêm tự động tính.
3. **Phần 2 — Khách**:
   - Gõ tên hoặc SĐT để tìm khách cũ → bấm chọn.
   - Nếu khách mới: gõ tên (vẫn ô tìm kiếm) → dưới danh sách có nút **+ Thêm nhanh: [tên]** → bấm vào, điền tên + SĐT → Lưu.
4. **Phần 3 — Giá & cọc**:
   - Giá/đêm **tự động hiện ra** từ giá mùa vụ. Có thể sửa nếu cần.
   - Nhập tiền cọc (nếu khách đã đặt cọc).
5. **Phần 4 — Ghi chú**: tuỳ chọn.
6. Bấm **Lưu**.

### Cách 2 — Khách đến bất ngờ (walk-in)

Trên lịch, bấm thẳng vào **ô trống** của phòng + ngày bạn muốn → mở form với phòng và ngày đã điền sẵn → làm tiếp như Cách 1.

### Lỗi có thể gặp

- **"Phòng đã được đặt từ X đến Y (khách: ...)"** → phòng đang trùng với đặt phòng khác. Chọn phòng khác hoặc đổi ngày.
- **"Ngày trả phòng phải sau ngày nhận phòng"** → kiểm tra lại 2 ô ngày.
- **Banner đỏ "Khách này đang trong danh sách đen"** → hãy hỏi quản lý trước khi tiếp nhận.

---

## 5. Nhận phòng (check-in)

1. Trên Lịch, bấm vào thanh đặt phòng của khách.
2. Khay trượt bên phải mở ra.
3. Bấm nút **Nhận phòng** (chỉ hiện khi trạng thái là "Đã xác nhận").
4. Trạng thái chuyển thành **Đang ở** (xanh lá).

Khách đã nhận phòng xong. Đưa chìa khoá.

---

## 6. Ghi nhận thanh toán

1. Bấm thanh đặt phòng của khách → khay trượt.
2. Cuộn xuống mục **Giá & thanh toán**.
3. Ở ô bên dưới:
   - Nhập **số tiền**.
   - Chọn **phương thức**: Tiền mặt / Chuyển khoản / Thẻ / Khác.
4. Bấm **Lưu**.

**Mẹo**: Bấm chữ xanh **"Còn lại: ..."** ở ngay dưới để tự động điền số tiền còn thiếu.

Có thể ghi nhiều lần nếu khách trả từng phần.

---

## 7. Thêm dịch vụ phát sinh

Khi khách dùng minibar, giặt ủi, ăn uống hoặc dịch vụ khác cần tính vào phòng:

1. Bấm thanh đặt phòng của khách → khay trượt.
2. Ở mục **Dịch vụ phát sinh**, bấm **+ Thêm dịch vụ**.
3. Chọn **loại**: Minibar / Giặt ủi / Ăn uống / Dịch vụ / Khác.
4. Nhập **mô tả** (ví dụ: *"Coca 2 chai"*).
5. Nhập **số tiền**.
6. Bấm **Lưu**.

Tổng tiền (tiền phòng + dịch vụ) tự động cập nhật. Khi in hoá đơn, tất cả đều hiện.

Nếu ghi nhầm, chỉ có quản lý mới xoá được. Hỏi quản lý.

---

## 8. Trả phòng (check-out)

1. Đảm bảo khách đã thanh toán đủ (kiểm tra ô "Còn lại" bằng 0).
2. Bấm thanh đặt phòng → khay trượt.
3. Bấm nút **Trả phòng**.
4. Trạng thái chuyển thành **Đã trả phòng** (xám).

**Quan trọng**: Phòng tự động được đánh dấu **Bẩn** trong mục Buồng phòng. Sau khi dọn xong, nhớ vào Buồng phòng đánh dấu **Sạch**.

---

## 9. Huỷ đặt phòng

Chỉ huỷ được khi trạng thái là **Đã xác nhận** (chưa nhận phòng). Nếu khách đã nhận phòng, phải trả phòng trước rồi mới xử lý.

1. Bấm thanh đặt phòng → khay trượt.
2. Cuộn xuống cuối → bấm nút đỏ **Huỷ đặt phòng**.
3. Xác nhận trên hộp thoại.

Thanh đặt phòng chuyển thành đường kẻ gạch ngang đỏ trên lịch. Dữ liệu vẫn còn để tra cứu sau này.

---

## 10. In hoá đơn

1. Bấm thanh đặt phòng → khay trượt.
2. Bấm nút **In hoá đơn**.
3. Xem trước nội dung trong cửa sổ.
4. Bấm nút xanh **In hoá đơn** ở dưới cùng → hộp thoại in của trình duyệt mở ra.
5. Chọn máy in, kích thước **A5 dọc**, bấm **Print**.

Hoá đơn gồm: thông tin khách sạn, số hoá đơn, thông tin khách, ngày ở, chi tiết phòng và dịch vụ, tổng cộng, phương thức thanh toán.

---

## 11. Quản lý khách

### Tìm khách cũ

1. Thanh bên trái → **Khách**.
2. Gõ tên, SĐT, hoặc số CMND/CCCD vào ô tìm kiếm.

### Thêm khách mới

1. **Khách** → **+ Thêm khách mới**.
2. Điền họ tên, SĐT, CMND/CCCD, quốc tịch, ghi chú.
3. **Lưu**.

### Sửa thông tin khách

Bấm vào dòng khách trong danh sách → form mở ra → sửa → **Lưu**.

### Khách có biểu tượng ⚠ đỏ

Là khách trong **danh sách đen** (đã bị quản lý đánh dấu). Khi bạn chọn khách này cho đặt phòng mới, hệ thống sẽ hiện banner đỏ cảnh báo. Hãy báo quản lý trước khi tiếp nhận.

---

## 12. Buồng phòng (trên máy tính bảng)

Khi đi dọn phòng, mở máy tính bảng → đăng nhập → vào mục **Buồng phòng**.

### Màn hình Buồng phòng

- **Lưới các phòng** hiển thị trạng thái bằng **màu đậm**:
  - Xanh lá = **Sạch**
  - Cam = **Bẩn**
  - Xanh dương = **Đã kiểm tra**
  - Đỏ = **Đang bảo trì**
  - Xám đậm = **Ngưng sử dụng**
- Phía trên có các **thẻ lọc** với dấu chấm màu và số đếm.
- Mỗi ô phòng hiện: **số phòng**, loại phòng, và nếu có khách đang ở → tên khách + ngày trả phòng.

### Cập nhật trạng thái phòng

1. Bấm vào ô phòng bạn muốn cập nhật.
2. Bảng hành động trượt lên từ dưới.
3. (Tuỳ chọn) Nhập **ghi chú**.
4. Bấm một trong các nút màu:
   - **Đánh dấu sạch** (xanh lá)
   - **Đánh dấu bẩn** (cam)
   - **Đã kiểm tra** (xanh dương)
   - **Báo bảo trì** (đỏ) — khi có hư hỏng
   - **Ngưng sử dụng** (xám) — khi phòng không thể cho thuê

Cập nhật xong, màu ô phòng đổi luôn.

### Xem lịch sử

Bấm nút **Lịch sử** trên thanh trên cùng → mở modal hiển thị ai đã thay đổi phòng nào, khi nào.

### Quy trình chuẩn

1. Khách trả phòng → hệ thống tự động đánh dấu phòng **Bẩn**.
2. Bạn đi dọn → vào **Buồng phòng** → bấm phòng → **Đánh dấu sạch**.
3. (Tuỳ chọn) Quản lý vào kiểm tra → đánh dấu **Đã kiểm tra**.
4. Phòng sẵn sàng cho khách mới.

---

## 13. Những lỗi thường gặp

| Vấn đề | Cách xử lý |
|---|---|
| Thấy banner đỏ **"Mất kết nối đến máy chủ"** ở trên cùng | Hỏi quản lý — có thể máy chủ bị tắt hoặc mất wifi |
| **"Sai tên đăng nhập hoặc PIN"** khi đăng nhập | Kiểm tra lại. Vẫn sai → hỏi giám đốc reset PIN |
| Không bấm được **Nhận phòng** | Kiểm tra trạng thái — có thể đã nhận rồi hoặc đã huỷ |
| **"Phòng đã được đặt từ X đến Y"** khi tạo đặt phòng | Chọn phòng khác hoặc ngày khác |
| Máy tính bảng không vào được app | Kiểm tra wifi, đảm bảo kết nối cùng mạng với máy chủ |
| Giá tự động hiện sai | Báo quản lý — giá mùa vụ có thể chưa cài đặt đúng |
| Muốn sửa một đặt phòng đã **Đã trả phòng** hoặc **Đã huỷ** | Không sửa được (quy định hệ thống). Tạo đặt phòng mới nếu cần |

Có vấn đề khác → xem [Xử lý sự cố](./troubleshooting.md) hoặc báo quản lý.

---

## Mẹo giúp ca làm trôi chảy

- **Mở ca ngay khi đến**. Kết ca khi về. Để quản lý theo dõi được.
- **Ghi chú bàn giao chi tiết**. Ca sau đọc được = hotel chạy trơn tru.
- **Cập nhật phòng sạch ngay sau khi dọn**. Đừng để hôm sau.
- **Thu tiền đủ trước khi trả phòng**. Sau khi trả phòng, đòi tiền khó hơn.
- **Khi khách đặt cọc**, nhập luôn vào hệ thống. Nếu quên, khi khách đến không ai biết họ đã cọc.
