# Hướng dẫn Quản lý

Tài liệu này dành cho **quản lý** — người chịu trách nhiệm vận hành hàng ngày, giá cả,
chi phí, báo cáo và kết sổ.

**Trước tiên**, hãy đọc [Hướng dẫn Lễ tân](./staff.md). Quản lý làm được tất cả những gì lễ
tân làm, cộng thêm các việc trong tài liệu này.

## Mục lục

1. [Quản lý phòng & loại phòng](#1-quản-lý-phòng--loại-phòng)
2. [Giá mùa vụ](#2-giá-mùa-vụ)
3. [Danh sách đen](#3-danh-sách-đen)
4. [Chi phí](#4-chi-phí)
5. [Báo cáo](#5-báo-cáo)
6. [Kết sổ cuối ngày](#6-kết-sổ-cuối-ngày)
7. [Sao lưu dữ liệu](#7-sao-lưu-dữ-liệu)
8. [Lịch sử ca làm](#8-lịch-sử-ca-làm)
9. [Xoá thanh toán / dịch vụ](#9-xoá-thanh-toán--dịch-vụ)
10. [Kế hoạch hàng ngày](#10-kế-hoạch-hàng-ngày)

---

## 1. Quản lý phòng & loại phòng

Vào **Cài đặt → Phòng**.

### Thêm phòng mới

1. Bấm **+ Thêm phòng**.
2. Nhập **Số phòng** (vd: `108`).
3. Chọn **Loại phòng** từ danh sách, hoặc bấm **+ Tạo loại mới...** để thêm loại mới.
4. Nhập **Giá cơ bản / đêm** (dùng khi không có giá mùa vụ nào khớp).
5. Bấm **Lưu**.

### Sửa phòng

Trực tiếp sửa trong bảng:
- Đổi số phòng, loại, giá cơ bản, tích/bỏ tích **Đang hoạt động**.
- Khi có thay đổi, nút **Lưu** nhỏ hiện bên phải dòng đó. Bấm để lưu.

### Cách dùng "Loại phòng"

Loại phòng vừa là nhãn mô tả, vừa là **nhóm để áp dụng giá mùa vụ**. Ví dụ:
- Tạo loại `single`, `double` cho phòng đơn và phòng đôi.
- Tạo loại `vip` cho các phòng đặc biệt.
- Tạo loại `view-bien` cho các phòng có view biển.

Khi muốn áp dụng một giá mùa vụ cho một nhóm phòng, cách đơn giản nhất là gán các phòng đó
cùng một **loại phòng**, rồi tạo giá mùa vụ nhắm vào loại đó.

---

## 2. Giá mùa vụ

Giá mùa vụ là luật định giá theo **khoảng thời gian** và **loại phòng**. Khi có khách đặt
phòng, hệ thống tự động tính giá/đêm dựa trên các giá mùa vụ đang áp dụng.

Vào **Cài đặt → Giá mùa vụ**.

### Cách thêm giá mùa vụ

1. Bấm **+ Thêm giá mùa vụ**.
2. Điền:
   - **Tên**: ví dụ *"Giá hè"*, *"Lễ 2/9"*, *"Giá VIP mùa cao điểm"*.
   - **Áp dụng cho**: chọn loại phòng, hoặc **Tất cả loại phòng**.
   - **Bắt đầu** — ngày đầu tiên áp dụng.
   - **Kết thúc** — ngày đầu tiên **KHÔNG** áp dụng. Ví dụ giá hè `01/06 → 01/09` nghĩa
     là áp dụng từ 1/6 đến hết 31/8.
   - **Giá / đêm**.
   - **Ưu tiên** (số, mặc định 0) — khi nhiều giá cùng áp dụng, cái nào ưu tiên cao hơn thắng.
3. Bấm **Lưu**.

### Luật chọn giá

Khi tạo đặt phòng, mỗi đêm ở hệ thống lọc các giá mùa vụ theo thứ tự:

1. Giá có ngày rơi vào [Bắt đầu, Kết thúc).
2. Giá có loại phòng khớp (hoặc "Tất cả loại phòng").
3. **Giá có loại phòng cụ thể thắng giá "Tất cả loại phòng"**.
4. Nếu vẫn nhiều giá, **ưu tiên cao hơn thắng**.
5. Nếu vẫn nhiều, giá mới tạo nhất thắng.
6. Nếu không có giá nào khớp → dùng **giá cơ bản** của phòng.

### Ví dụ thực tế

Bạn có 3 giá:

| Tên | Bắt đầu | Kết thúc | Áp dụng | Ưu tiên | Giá |
|---|---|---|---|---|---|
| Giá hè | 01/06 | 01/09 | Tất cả | 0 | 600.000 ₫ |
| Giá hè VIP | 01/06 | 01/09 | vip | 10 | 1.200.000 ₫ |
| Lễ 2/9 | 01/09 | 05/09 | Tất cả | 50 | 800.000 ₫ |

Khách đặt phòng VIP từ **30/08 → 03/09** (4 đêm):
- **30/08**: "Giá hè VIP" thắng vì có loại phòng cụ thể → 1.200.000 ₫
- **31/08**: như trên → 1.200.000 ₫
- **01/09**: "Lễ 2/9" ưu tiên 50 thắng → 800.000 ₫
- **02/09**: "Lễ 2/9" → 800.000 ₫
- **Tổng**: 4.000.000 ₫, trung bình **1.000.000 ₫/đêm**

### Lưu ý quan trọng

- **Đặt phòng cũ không bị ảnh hưởng** khi bạn sửa giá mùa vụ. Hệ thống chụp giá vào lúc
  tạo đặt phòng.
- **Lễ tân có thể nhập giá khác** khi tạo đặt phòng (cho deal đặc biệt, giảm giá khách quen).
- Hệ thống **không phân biệt chữ hoa/thường** và tự bỏ khoảng trắng thừa. `vip` = `VIP` = `Vip`.

### Xoá giá mùa vụ

Bấm biểu tượng thùng rác ở cuối dòng. Xoá xong không ảnh hưởng tới đặt phòng đã tạo.

---

## 3. Danh sách đen

Đánh dấu khách có vấn đề (không thanh toán, gây rối, vv).

### Đánh dấu

1. Vào **Khách** → bấm vào khách cần đánh dấu → form mở ra.
2. Cuộn xuống mục **Danh sách đen**.
3. Nhập **Lý do**.
4. Bấm **Đánh dấu danh sách đen**.

Từ giờ, khách này sẽ có biểu tượng ⚠ đỏ trong danh sách khách và khi lễ tân chọn cho đặt
phòng mới, hệ thống hiện banner đỏ cảnh báo.

### Bỏ đánh dấu

Vào khách đó → mục **Danh sách đen** → bấm **Bỏ khỏi danh sách đen**.

---

## 4. Chi phí

Thanh bên trái → **Chi phí**.

### Chọn khoảng thời gian

Chọn **Tháng này / Tháng trước / Tuỳ chọn** ở trên cùng.

### Thêm chi phí

1. Bấm **+ Thêm chi phí**.
2. Điền:
   - **Ngày**.
   - **Danh mục** — tự do, nhưng nên thống nhất (vd: *Điện*, *Nước*, *Vệ sinh*, *Sửa chữa*, *Marketing*, *Lương*).
   - **Mô tả** — chi tiết.
   - **Số tiền**.
   - **Nhà cung cấp** — tuỳ chọn.
3. Bấm **Lưu**.

### Xem tổng hợp

Khi chọn khoảng thời gian, phía trên bảng hiện:
- **Tổng chi phí** trong khoảng đó.
- **Top 5 danh mục** theo số tiền.

### Xoá chi phí

Bấm thùng rác ở cuối dòng → xác nhận.

### Mẹo

- **Thống nhất tên danh mục**. `Điện` vs `tiền điện` vs `hoá đơn điện` là 3 danh mục khác nhau trong báo cáo tổng hợp.
- **Ngày là ngày phát sinh chi phí**, không phải ngày bạn nhập vào hệ thống.
- **Không tính lương vào chi phí** nếu bạn chưa có ý định tính lợi nhuận — hoặc tính nhất quán, nhưng đã tính thì phải tính đều đặn.

---

## 5. Báo cáo

Thanh bên trái → **Báo cáo**.

### Chọn khoảng thời gian

Preset: Tuần này / Tháng này / Tháng trước / Tuỳ chọn.

### Các chỉ số (KPI)

Thanh ngang trên cùng có 5 số. Di chuột qua icon **ℹ** để xem giải thích ngắn.

| Chỉ số | Ý nghĩa |
|---|---|
| **Công suất** | % phòng-đêm đã bán trên tổng phòng-đêm có sẵn |
| **Doanh thu** | Tổng số tiền khách đã thanh toán trong kỳ |
| **ADR** | Giá trung bình / đêm của phòng **đã bán** |
| **RevPAR** | Doanh thu / phòng **có sẵn** (cả phòng trống). Chỉ số quan trọng nhất |
| **Số đặt phòng** | Số đặt phòng chạm vào kỳ (không tính huỷ / không đến) |

### Biểu đồ doanh thu theo ngày

Dưới KPI là biểu đồ cột hiển thị doanh thu từng ngày. Di chuột qua từng cột để xem số
chính xác.

### Giải thích thuật ngữ

Cuối trang có mục **"Giải thích các chỉ số báo cáo"** — bấm mở ra để xem công thức và ví dụ
cụ thể từng chỉ số.

### Đọc báo cáo như thế nào

- **RevPAR tăng** = kinh doanh tốt hơn, bất kể do giá hay do lấp đầy phòng.
- **RevPAR giảm + ADR tăng** = giá đang cao quá, mất khách.
- **RevPAR giảm + công suất tăng** = giảm giá quá sâu.
- **Công suất > 85%** mà RevPAR không tăng nhiều = có thể nâng giá.
- So sánh **Tháng này vs Tháng trước** để thấy xu hướng.

### Xuất / lưu báo cáo

Hiện tại chưa có nút xuất file. Cách nhanh: **chụp màn hình** hoặc **Ctrl+P** để in ra PDF.

---

## 6. Kết sổ cuối ngày

Là quy trình "khoá sổ" một ngày — chốt doanh thu, công suất, phát hiện các vấn đề còn tồn
đọng (khách chưa thanh toán, phòng chưa dọn, ca chưa đóng).

Vào **Cài đặt → Kết sổ cuối ngày**.

### Quy trình chuẩn

1. Chọn ngày cần kết sổ (mặc định là hôm qua).
2. Xem **3 số KPI** ở trên: doanh thu, công suất, ADR.
3. **Đọc kỹ phần cảnh báo** (vàng, nếu có):
   - **"N đặt phòng chưa thanh toán đầy đủ"** → vào lịch, tìm các đặt phòng này, liên hệ
     khách hoặc ghi nhận thanh toán.
   - **"N phòng chưa dọn"** → bảo lễ tân/buồng phòng dọn trước khi kết sổ.
   - **"N ca nhân viên chưa đóng"** → bảo nhân viên liên quan kết ca.
4. Giải quyết hết cảnh báo (hoặc chấp nhận còn tồn đọng).
5. Nhập **Ghi chú** nếu muốn (ví dụ: *"Phòng 205 mất điện 2 giờ chiều, đã báo thợ."*).
6. Bấm **Chạy kết sổ**.
7. Ngày đã bị khoá — **không chạy lại được**.

### Khi nào kết sổ

Làm **cuối mỗi ngày**, nên làm vào sáng hôm sau (khi mọi hoạt động của ngày hôm trước đã
hoàn tất).

### Lịch sử kết sổ

Phía dưới có danh sách các ngày đã kết sổ: doanh thu, công suất, ADR, ai kết, lúc nào.

---

## 7. Sao lưu dữ liệu

Vào **Cài đặt → Sao lưu**.

### Sao lưu tự động

Mỗi lần tắt máy chủ, hệ thống tự sao lưu. Không cần làm gì.

### Sao lưu thủ công

Bấm **Tạo bản sao lưu ngay**. Một file `.sqlite` được tạo trong thư mục sao lưu. Dùng khi:
- Trước khi làm thay đổi lớn (thêm nhiều phòng, sửa nhiều giá mùa vụ).
- Định kỳ cuối tuần / cuối tháng (nhớ sao lưu vào USB/cloud riêng).

### Xoá bản sao lưu cũ

Bấm **Dọn bản cũ (>30 ngày)** — xoá các file cũ hơn 30 ngày.

### Vị trí lưu

Trong phần sao lưu có hiện đường dẫn thư mục dữ liệu. Ví dụ:
`C:\Users\Owner\OneDrive\nextHotel\backups\`

Nếu đường dẫn này nằm trong OneDrive / Google Drive / Dropbox → bản sao lưu **tự động
đồng bộ lên đám mây**, an toàn khi máy chủ hỏng.

### Khi cần khôi phục

Nếu máy chủ hỏng / dữ liệu mất → báo IT / giám đốc. Quy trình:
1. Tìm file sao lưu gần nhất (vd: `nexthotel-20260415-103000.sqlite`).
2. Copy đè lên file `nexthotel.db` trong thư mục dữ liệu chính.
3. Khởi động lại máy chủ.

---

## 8. Lịch sử ca làm

Vào **Cài đặt → Lịch sử ca**.

Xem tất cả ca làm trong N ngày qua (7 / 14 / 30 / 90 ngày):
- Nhân viên, giờ vào, giờ kết, số giờ làm, ghi chú bàn giao.
- Ca **Đang mở** hiện màu xanh lá — nhân viên chưa kết ca.

### Dùng để làm gì

- **Tính lương / chấm công**.
- **Kiểm tra ai đang làm** vào bất cứ thời điểm nào.
- **Đọc ghi chú bàn giao** cũ khi khách phản ánh vấn đề ("lúc đó ai trực?").

---

## 9. Xoá thanh toán / dịch vụ

Chỉ quản lý và giám đốc được xoá.

### Xoá thanh toán

1. Mở đặt phòng (khay trượt).
2. Trong mục **Thanh toán**, hiện tại không có nút xoá trực tiếp từ UI (tránh thao tác nhầm).
   Để xoá: cần sửa database trực tiếp — báo giám đốc / IT.

*Lưu ý: phiên bản v1 tập trung vào đơn giản. Nếu cần sửa giao dịch sai, cách dễ nhất là
ghi thêm một thanh toán âm (cần xử lý riêng).*

### Xoá dịch vụ phát sinh

1. Mở đặt phòng → mục **Dịch vụ phát sinh**.
2. Bấm biểu tượng **thùng rác** cạnh dịch vụ cần xoá (chỉ hiện với quản lý+).

Khi xoá, hệ thống tự tính lại tổng tiền folio và tình trạng thanh toán.

---

## 10. Kế hoạch hàng ngày

### Buổi sáng

- Kiểm tra có khách đến hôm nay không (thanh sidebar).
- Kiểm tra phòng sẵn sàng — **Buồng phòng**, các phòng cho khách mới phải là **Sạch** hoặc **Đã kiểm tra**.
- Xem báo cáo tuần trước để nắm tình hình.

### Trong ngày

- Xử lý các việc lễ tân không quyết được: giảm giá đặc biệt, khách phàn nàn, xoá dịch vụ ghi nhầm.
- Theo dõi **Lịch sử ca** xem ai đang trực.

### Cuối ngày

- **Kết sổ ngày hôm qua** (nếu chưa làm): Cài đặt → Kết sổ cuối ngày.
- Ghi nhận chi phí phát sinh trong ngày (Chi phí → Thêm).

### Cuối tuần

- Xem báo cáo **Tuần này** — so sánh với tuần trước.
- Tạo bản **sao lưu thủ công** (Cài đặt → Sao lưu → Tạo bản sao lưu ngay).

### Cuối tháng

- Xem báo cáo **Tháng này** — ADR, RevPAR, công suất.
- Kiểm tra tổng **chi phí tháng này** (Chi phí).
- Tính lợi nhuận gộp = Doanh thu − Chi phí.
- Điều chỉnh **giá mùa vụ** nếu công suất quá thấp / quá cao.

---

## Danh sách công việc khi nhận bàn giao

Nếu bạn mới nhận vị trí quản lý:

- [ ] Đọc hết hướng dẫn này (và [Hướng dẫn Lễ tân](./staff.md)).
- [ ] Lấy tên đăng nhập + PIN từ giám đốc.
- [ ] Đăng nhập, thử từng tab.
- [ ] Xem **Cài đặt → Phòng**, kiểm tra đủ số phòng và loại phòng đúng.
- [ ] Xem **Cài đặt → Giá mùa vụ**, nắm cấu trúc giá hiện tại.
- [ ] Xem **Báo cáo → Tháng trước** để biết tình hình gần nhất.
- [ ] Thử chạy **Kết sổ cuối ngày** cho một ngày cũ (nếu chưa kết).
- [ ] Hỏi giám đốc nếu có gì không rõ.
