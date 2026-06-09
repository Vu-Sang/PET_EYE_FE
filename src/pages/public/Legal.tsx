import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Shield, FileText } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Legal() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy'>(
    location.pathname.includes('privacy') ? 'privacy' : 'terms'
  );

  useEffect(() => {
    if (location.pathname.includes('privacy')) setActiveTab('privacy');
    else setActiveTab('terms');
  }, [location.pathname]);

  const termsContent = (
    <div className="space-y-10 text-slate-600 leading-relaxed">
      <div className="bg-blue-50/70 p-5 rounded-2xl border border-blue-100">
        <p className="text-sm font-semibold text-blue-800 text-center">Chính sách này có hiệu lực kể từ ngày 06/07/2026 cho đến khi có thông báo thay thế hoặc cập nhật mới từ PetEye.</p>
      </div>

      <section>
        <h3 className="text-2xl font-bold text-slate-900 mb-4">1. Giới thiệu chung</h3>
        <p className="mb-3">PetEye là nền tảng công nghệ kết nối chủ nuôi thú cưng với các đơn vị cung cấp dịch vụ chăm sóc thú cưng như lưu trú (pet boarding), spa, grooming, khách sạn thú cưng và các dịch vụ liên quan khác.</p>
        <p className="mb-3">Khi truy cập hoặc sử dụng website và các dịch vụ do PetEye cung cấp (sau đây gọi chung là “Nền tảng”), bạn xác nhận đã đọc, hiểu và đồng ý tuân thủ các Điều khoản sử dụng này cùng các chính sách liên quan được công bố trên nền tảng.</p>
        <p>PetEye có quyền sửa đổi, bổ sung hoặc cập nhật Điều khoản sử dụng vào bất kỳ thời điểm nào. Các thay đổi sẽ được thông báo công khai trên nền tảng trước khi áp dụng. Việc tiếp tục sử dụng dịch vụ sau khi các thay đổi có hiệu lực đồng nghĩa với việc bạn chấp nhận các nội dung được cập nhật.</p>
      </section>

      <section>
        <h3 className="text-2xl font-bold text-slate-900 mb-4">2. Vai trò của PetEye</h3>
        <p className="mb-3">PetEye là nền tảng trung gian kết nối giữa người dùng và các đối tác cung cấp dịch vụ chăm sóc thú cưng.</p>
        <p className="mb-3">PetEye không trực tiếp cung cấp dịch vụ lưu trú, chăm sóc, điều trị, vận chuyển hoặc các dịch vụ thú cưng khác, trừ khi có thông báo riêng bằng văn bản.</p>
        <p className="mb-3 font-semibold text-slate-800">PetEye có trách nhiệm:</p>
        <ul className="list-disc pl-6 space-y-2 mb-4">
          <li>Cung cấp nền tảng đặt lịch và thanh toán trực tuyến.</li>
          <li>Kiểm duyệt và xác thực thông tin đối tác theo quy trình nội bộ.</li>
          <li>Cung cấp công cụ đánh giá, phản hồi và hỗ trợ giải quyết tranh chấp.</li>
          <li>Hỗ trợ tích hợp tính năng theo dõi camera trực tuyến đối với các đối tác đủ điều kiện.</li>
        </ul>
        <p>PetEye không chịu trách nhiệm đối với các thiệt hại phát sinh từ việc cung cấp dịch vụ của đối tác ngoài phạm vi kiểm soát hợp lý của nền tảng.</p>
      </section>

      <section>
        <h3 className="text-2xl font-bold text-slate-900 mb-4">3. Quy định dành cho Người dùng</h3>
        
        <h4 className="text-lg font-bold text-slate-800 mt-6 mb-3">3.1. Thông tin tài khoản</h4>
        <ul className="list-disc pl-6 space-y-2 mb-4">
          <li>Người dùng cam kết cung cấp đầy đủ, chính xác và cập nhật các thông tin cần thiết khi đăng ký tài khoản hoặc đặt dịch vụ trên PetEye.</li>
          <li>Người dùng chịu trách nhiệm bảo mật tài khoản, mật khẩu và mọi hoạt động phát sinh từ tài khoản của mình.</li>
        </ul>

        <h4 className="text-lg font-bold text-slate-800 mt-6 mb-3">3.2. Đặt lịch dịch vụ</h4>
        <ul className="list-disc pl-6 space-y-2 mb-4">
          <li><strong>Người dùng có trách nhiệm:</strong> Cung cấp chính xác thông tin thú cưng, tuân thủ các quy định và điều kiện riêng của từng đối tác, thanh toán đầy đủ các khoản phí theo quy định.</li>
          <li>PetEye có quyền từ chối hoặc hủy giao dịch nếu phát hiện thông tin không chính xác, gian lận hoặc có dấu hiệu vi phạm pháp luật.</li>
        </ul>

        <h4 className="text-lg font-bold text-slate-800 mt-6 mb-3">3.3. Chính sách hủy lịch và đi trễ</h4>
        <p className="mb-3">Để đảm bảo quyền lợi cho cả khách hàng và các đối tác cơ sở chăm sóc, PetEye áp dụng chính sách hủy lịch như sau:</p>
        <div className="pl-5 border-l-2 border-slate-200 space-y-5">
          <div>
            <p className="font-semibold text-slate-800 mb-2">Trường hợp Khách hàng chủ động hủy lịch hẹn</p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>Hủy <strong>trước 5 tiếng</strong> so với giờ hẹn: Khách hàng được hoàn lại tiền dịch vụ, sau khi trừ đi tiền cọc (tương đương mức phí dịch vụ của nền tảng).</li>
              <li>Hủy <strong>trong vòng 5 tiếng</strong> (sát giờ hẹn): Khách hàng không được hoàn cọc, và mất thêm <strong>50% giá trị dịch vụ</strong> như một khoản bồi thường thiệt hại cho đối tác. Số tiền còn lại sẽ được hoàn trả.</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-slate-800 mb-2">Trường hợp Khách hàng đi trễ hoặc không đến (No-show)</p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>Khách hàng có trách nhiệm đến đúng giờ hẹn. Nếu đi trễ quá thời gian chờ cho phép của đối tác (thường là 15 phút), đơn hàng có thể bị đối tác hủy.</li>
              <li>Đối với đơn hàng thanh toán trực tuyến: Khách hàng không được hoàn cọc, và mất thêm <strong>30% giá trị dịch vụ</strong> như khoản bồi thường cho đối tác. Số tiền còn lại sẽ được hoàn trả.</li>
              <li>Đối với đơn hàng đặt cọc: Khách hàng sẽ bị mất hoàn toàn khoản tiền đã đặt cọc nếu vi phạm chính sách đi trễ.</li>
            </ul>
          </div>
        </div>

        <h4 className="text-lg font-bold text-slate-800 mt-6 mb-3">3.4. Đánh giá và phản hồi</h4>
        <p>Người dùng được quyền đánh giá dịch vụ sau khi hoàn thành giao dịch. Các nội dung đánh giá phải trung thực, khách quan và không chứa: thông tin sai sự thật, nội dung xúc phạm, vu khống, nội dung vi phạm pháp luật hoặc thuần phong mỹ tục. PetEye có quyền ẩn hoặc xóa các nội dung vi phạm mà không cần thông báo trước.</p>
      </section>

      <section>
        <h3 className="text-2xl font-bold text-slate-900 mb-4">4. Quy định dành cho Đối tác</h3>
        <p className="mb-3 font-semibold text-slate-800">Để tham gia nền tảng PetEye, đối tác cam kết:</p>
        <ul className="list-disc pl-6 space-y-2 mb-4">
          <li>Có đầy đủ giấy phép kinh doanh và giấy tờ pháp lý theo quy định của pháp luật.</li>
          <li>Cung cấp thông tin chính xác về cơ sở vật chất, giá dịch vụ và năng lực phục vụ.</li>
          <li>Thực hiện dịch vụ đúng như nội dung đã công bố trên nền tảng.</li>
          <li>Đảm bảo an toàn, sức khỏe và phúc lợi của thú cưng trong thời gian cung cấp dịch vụ.</li>
        </ul>
        <p className="mb-3 font-semibold text-slate-800">PetEye có quyền tạm ngừng hoặc chấm dứt hợp tác với đối tác trong các trường hợp:</p>
        <ul className="list-disc pl-6 space-y-2 mb-4">
          <li>Cung cấp thông tin sai lệch.</li>
          <li>Gian lận hoặc thao túng đánh giá.</li>
          <li>Có hành vi ngược đãi động vật.</li>
          <li>Vi phạm pháp luật hoặc gây ảnh hưởng nghiêm trọng đến uy tín của nền tảng.</li>
        </ul>

        <h4 className="text-lg font-bold text-slate-800 mt-6 mb-3">4.1. Camera giám sát</h4>
        <p className="mb-3">Đối với các đối tác đăng ký tính năng camera trực tuyến:</p>
        <ul className="list-disc pl-6 space-y-2 mb-4">
          <li>Đối tác đồng ý cho PetEye tích hợp và truyền tải hình ảnh camera tới khách hàng có liên quan.</li>
          <li>Camera chỉ phục vụ mục đích theo dõi quá trình chăm sóc thú cưng và hỗ trợ giải quyết tranh chấp.</li>
          <li>PetEye không chịu trách nhiệm đối với sự cố kỹ thuật phát sinh từ hệ thống camera của đối tác.</li>
        </ul>
      </section>

      <section>
        <h3 className="text-2xl font-bold text-slate-900 mb-4">5. Hỗ trợ khách hàng và giải quyết tranh chấp</h3>
        <p className="mb-3">PetEye luôn nỗ lực xây dựng một môi trường minh bạch và đáng tin cậy cho cộng đồng yêu thú cưng. Trong trường hợp phát sinh tranh chấp giữa khách hàng và đối tác:</p>
        <ul className="list-disc pl-6 space-y-2 mb-4">
          <li>Các bên ưu tiên giải quyết thông qua thương lượng.</li>
          <li>PetEye có thể tham gia với vai trò trung gian hỗ trợ.</li>
          <li>PetEye có quyền yêu cầu các bên cung cấp bằng chứng như hình ảnh, video camera, hóa đơn hoặc tài liệu liên quan.</li>
          <li>Quyết định cuối cùng về trách nhiệm dân sự hoặc bồi thường thuộc về các bên liên quan theo quy định của pháp luật.</li>
        </ul>
      </section>

      <section>
        <h3 className="text-2xl font-bold text-slate-900 mb-4">6. Quyền sở hữu trí tuệ</h3>
        <p className="mb-3">Toàn bộ nội dung trên nền tảng PetEye bao gồm nhưng không giới hạn: Tên thương hiệu PetEye, Logo, Thiết kế giao diện, Hình ảnh, Video, Nội dung văn bản, Mã nguồn, Dữ liệu hệ thống,...đều thuộc quyền sở hữu hợp pháp của PetEye hoặc các bên được cấp phép.</p>
        <p>Mọi hành vi sao chép, chỉnh sửa, phân phối, khai thác hoặc sử dụng cho mục đích thương mại mà không có sự đồng ý bằng văn bản của PetEye đều bị nghiêm cấm.</p>
      </section>

      <section>
        <h3 className="text-2xl font-bold text-slate-900 mb-4">7. Giới hạn trách nhiệm</h3>
        <p className="mb-3">PetEye là nền tảng kết nối và không phải là bên trực tiếp cung cấp dịch vụ chăm sóc thú cưng. Trong phạm vi pháp luật cho phép, PetEye không chịu trách nhiệm đối với:</p>
        <ul className="list-disc pl-6 space-y-2 mb-4">
          <li>Thiệt hại phát sinh từ việc sử dụng dịch vụ của đối tác.</li>
          <li>Hành vi vi phạm của khách hàng hoặc đối tác.</li>
          <li>Sự cố kỹ thuật ngoài khả năng kiểm soát hợp lý của nền tảng.</li>
          <li>Thiệt hại gián tiếp, ngẫu nhiên hoặc phát sinh từ bên thứ ba.</li>
        </ul>
      </section>

      <section>
        <h3 className="text-2xl font-bold text-slate-900 mb-4">8. Luật áp dụng</h3>
        <p className="mb-3">Điều khoản sử dụng này được điều chỉnh và giải thích theo pháp luật Việt Nam.</p>
        <p>Mọi tranh chấp phát sinh liên quan đến việc sử dụng nền tảng PetEye sẽ được ưu tiên giải quyết bằng thương lượng. Trường hợp không đạt được thỏa thuận, tranh chấp sẽ được giải quyết tại cơ quan có thẩm quyền theo quy định của pháp luật Việt Nam.</p>
      </section>
    </div>
  );

  const privacyContent = (
    <div className="space-y-10 text-slate-600 leading-relaxed">
      <div className="bg-blue-50/70 p-5 rounded-2xl border border-blue-100">
        <p className="text-sm font-semibold text-blue-800 text-center">Chính sách này có hiệu lực từ ngày 06/07/2026 cho đến khi có thông báo cập nhật mới từ PetEye.</p>
      </div>

      <section>
        <h3 className="text-2xl font-bold text-slate-900 mb-4">1. Giới thiệu</h3>
        <p className="mb-3">Chào mừng bạn đến với PetEye.</p>
        <p className="mb-3">PetEye là nền tảng công nghệ kết nối chủ nuôi thú cưng với các dịch vụ chăm sóc thú cưng uy tín như lưu trú, spa, grooming và các dịch vụ liên quan khác. Chúng tôi hiểu rằng quyền riêng tư và việc bảo vệ dữ liệu cá nhân là những vấn đề quan trọng đối với người dùng. Vì vậy, PetEye cam kết thu thập, sử dụng và bảo vệ thông tin cá nhân của bạn một cách minh bạch, an toàn và phù hợp với các quy định của pháp luật hiện hành.</p>
        <p className="mb-3">Bằng việc truy cập, đăng ký tài khoản hoặc sử dụng các dịch vụ trên nền tảng PetEye, bạn xác nhận rằng đã đọc, hiểu và đồng ý với các nội dung được quy định trong Chính sách bảo mật này.</p>
        <p>PetEye có quyền sửa đổi, bổ sung hoặc cập nhật Chính sách bảo mật vào bất kỳ thời điểm nào nhằm phù hợp với sự thay đổi của hoạt động kinh doanh hoặc yêu cầu của pháp luật. Mọi thay đổi sẽ được công bố công khai trên nền tảng trước khi chính thức áp dụng. Việc bạn tiếp tục sử dụng dịch vụ sau thời điểm cập nhật được xem là sự đồng ý đối với các nội dung sửa đổi đó.</p>
      </section>

      <section>
        <h3 className="text-2xl font-bold text-slate-900 mb-4">2. Mục đích thu thập thông tin</h3>
        <p className="mb-3">Trong quá trình sử dụng dịch vụ, PetEye có thể thu thập một số thông tin cần thiết nhằm đảm bảo việc cung cấp dịch vụ được thực hiện hiệu quả và an toàn.</p>
        <p className="mb-3">Các thông tin được thu thập bao gồm thông tin cá nhân như họ tên, số điện thoại, địa chỉ email, thông tin đăng nhập tài khoản và các thông tin liên quan đến thú cưng như tên, giống loài, độ tuổi, tình trạng sức khỏe hoặc lịch sử tiêm phòng. Thông tin về thú cưng có thể do người dùng tự nguyện cung cấp hoặc được ghi nhận bởi đối tác cung cấp dịch vụ (nhân viên shop, bác sĩ thú y) trong quá trình thực hiện dịch vụ trên nền tảng. Trong một số trường hợp, PetEye có thể thu thập dữ liệu vị trí của thiết bị khi người dùng cho phép nhằm hỗ trợ tìm kiếm các cơ sở chăm sóc thú cưng phù hợp và thuận tiện hơn.</p>
        <p className="mb-3">Việc thu thập các thông tin này nhằm mục đích xác thực tài khoản, hỗ trợ đặt lịch dịch vụ, kết nối người dùng với các đối tác cung cấp dịch vụ, xử lý giao dịch thanh toán, chăm sóc khách hàng, nâng cao trải nghiệm sử dụng nền tảng cũng như cải thiện chất lượng sản phẩm và dịch vụ của PetEye.</p>
        <p>Người dùng chịu trách nhiệm về tính chính xác và hợp pháp của các thông tin được cung cấp cho PetEye. Trong trường hợp phát hiện thông tin không chính xác, giả mạo hoặc có dấu hiệu vi phạm pháp luật, PetEye có quyền từ chối cung cấp dịch vụ hoặc tạm khóa tài khoản để xác minh.</p>
      </section>

      <section>
        <h3 className="text-2xl font-bold text-slate-900 mb-4">3. Phạm vi sử dụng thông tin</h3>
        <p className="mb-3">PetEye sử dụng thông tin cá nhân của người dùng nhằm phục vụ trực tiếp cho quá trình vận hành nền tảng và cung cấp dịch vụ. Các thông tin này có thể được sử dụng để tạo và quản lý tài khoản người dùng, xác nhận giao dịch đặt lịch, gửi thông báo liên quan đến đơn hàng, hỗ trợ giải quyết các yêu cầu chăm sóc khách hàng, xử lý tranh chấp phát sinh giữa các bên và cải thiện chất lượng dịch vụ.</p>
        <p className="mb-3">Ngoài ra, PetEye có thể sử dụng dữ liệu để thực hiện các hoạt động nghiên cứu, phân tích hành vi sử dụng nhằm nâng cao trải nghiệm người dùng, phát triển các tính năng mới hoặc gửi các thông tin khuyến mại, ưu đãi và thông báo liên quan đến dịch vụ nếu người dùng đồng ý nhận các thông tin này.</p>
        <p>PetEye cam kết không sử dụng dữ liệu cá nhân của người dùng cho các mục đích ngoài phạm vi nêu trên nếu chưa nhận được sự đồng ý từ người dùng, trừ các trường hợp được yêu cầu bởi cơ quan nhà nước có thẩm quyền theo quy định của pháp luật.</p>
      </section>

      <section>
        <h3 className="text-2xl font-bold text-slate-900 mb-4">4. Chính sách đối với dữ liệu Camera trực tuyến</h3>
        <p className="mb-3">Nhằm nâng cao tính minh bạch và sự an tâm cho chủ nuôi, PetEye có thể hỗ trợ tính năng theo dõi camera trực tuyến tại các cơ sở đối tác tham gia chương trình Camera Monitoring.</p>
        <p className="mb-3">Quyền truy cập vào hình ảnh camera chỉ được cấp cho những khách hàng đã xác thực tài khoản và có thú cưng đang sử dụng dịch vụ tại cơ sở tương ứng. Việc truy cập được giới hạn trong thời gian sử dụng dịch vụ và chỉ áp dụng đối với các khu vực được đối tác cho phép tích hợp trên nền tảng.</p>
        <p className="mb-3">PetEye áp dụng các biện pháp kỹ thuật phù hợp nhằm bảo vệ dữ liệu truyền tải giữa hệ thống camera và người dùng, đồng thời hạn chế tối đa các hành vi truy cập trái phép.</p>
        <p className="mb-3">PetEye không lưu trữ vĩnh viễn các luồng phát trực tiếp từ camera. Trong một số trường hợp đặc biệt như giải quyết khiếu nại, điều tra sự cố hoặc đáp ứng yêu cầu của cơ quan nhà nước có thẩm quyền, một phần dữ liệu liên quan có thể được lưu giữ tạm thời theo quy định của pháp luật và chính sách nội bộ của nền tảng.</p>
        <p>Người dùng không được phép chia sẻ quyền truy cập camera cho bên thứ ba hoặc sử dụng hình ảnh từ hệ thống camera vào các mục đích vi phạm pháp luật, xâm phạm quyền riêng tư hoặc gây ảnh hưởng đến các cá nhân, tổ chức liên quan.</p>
      </section>

      <section>
        <h3 className="text-2xl font-bold text-slate-900 mb-4">5. Chia sẻ thông tin với bên thứ ba</h3>
        <p className="mb-3 font-semibold text-slate-800">PetEye cam kết không mua bán, trao đổi hoặc chuyển giao thông tin cá nhân của người dùng cho bất kỳ bên thứ ba nào vì mục đích thương mại.</p>
        <p className="mb-3">Trong quá trình cung cấp dịch vụ, PetEye có thể chia sẻ một số thông tin cần thiết với đối tác mà người dùng lựa chọn đặt lịch nhằm phục vụ việc chăm sóc thú cưng và thực hiện giao dịch. Ngoài ra, dữ liệu giao dịch có thể được chia sẻ với các đơn vị trung gian thanh toán hoặc các nhà cung cấp dịch vụ hỗ trợ kỹ thuật trong phạm vi cần thiết để đảm bảo nền tảng vận hành ổn định.</p>
        <p>Trong trường hợp có yêu cầu hợp pháp từ cơ quan nhà nước có thẩm quyền theo quy định của pháp luật, PetEye có quyền cung cấp các thông tin liên quan để phục vụ công tác điều tra, xử lý vi phạm hoặc bảo vệ quyền và lợi ích hợp pháp của các bên liên quan.</p>
      </section>

      <section>
        <h3 className="text-2xl font-bold text-slate-900 mb-4">6. Thời gian lưu trữ thông tin</h3>
        <p className="mb-3">Thông tin cá nhân của người dùng sẽ được lưu trữ trong suốt thời gian tài khoản còn hoạt động trên hệ thống PetEye. Trong trường hợp người dùng muốn xóa tài khoản và toàn bộ dữ liệu liên quan, vui lòng liên hệ trực tiếp với PetEye thông qua các kênh hỗ trợ chính thức được công bố trên nền tảng. Đội ngũ PetEye sẽ tiếp nhận và xử lý yêu cầu trong thời gian sớm nhất.</p>
        <p>Trong một số trường hợp, PetEye có thể tiếp tục lưu giữ một phần dữ liệu cần thiết nhằm đáp ứng các nghĩa vụ pháp lý, giải quyết tranh chấp, ngăn ngừa gian lận hoặc bảo vệ quyền và lợi ích hợp pháp của PetEye cũng như các bên liên quan theo quy định của pháp luật.</p>
      </section>

      <section>
        <h3 className="text-2xl font-bold text-slate-900 mb-4">7. Quyền của người dùng</h3>
        <p className="mb-3">Người dùng có quyền truy cập, cập nhật, chỉnh sửa hoặc yêu cầu xóa các thông tin cá nhân của mình được lưu trữ trên hệ thống PetEye. Người dùng cũng có quyền yêu cầu hạn chế hoặc phản đối việc xử lý dữ liệu cá nhân trong các trường hợp được pháp luật cho phép.</p>
        <p className="mb-3">Các yêu cầu liên quan đến dữ liệu cá nhân có thể được thực hiện thông qua phần quản lý tài khoản trên nền tảng hoặc bằng cách liên hệ trực tiếp với PetEye thông qua các kênh hỗ trợ chính thức.</p>
        <p>PetEye sẽ tiếp nhận, xem xét và phản hồi các yêu cầu trong thời gian hợp lý theo quy định hiện hành.</p>
      </section>

      <section>
        <h3 className="text-2xl font-bold text-slate-900 mb-4">8. Cam kết bảo mật thông tin</h3>
        <p className="mb-3">PetEye áp dụng các biện pháp kỹ thuật và quản lý phù hợp nhằm bảo vệ dữ liệu cá nhân của người dùng khỏi các hành vi truy cập trái phép, tiết lộ, thay đổi hoặc phá hủy dữ liệu.</p>
        <p className="mb-3">Các biện pháp bảo mật có thể bao gồm mã hóa dữ liệu, kiểm soát quyền truy cập nội bộ, xác thực tài khoản, sao lưu dữ liệu định kỳ và giám sát các hoạt động bất thường trên hệ thống.</p>
        <p>Mặc dù PetEye luôn nỗ lực duy trì mức độ bảo mật cao nhất có thể, người dùng cũng cần chủ động bảo vệ thông tin đăng nhập của mình và không chia sẻ tài khoản cho bất kỳ bên thứ ba nào. Trong trường hợp phát hiện dấu hiệu truy cập trái phép hoặc rò rỉ thông tin, người dùng cần thông báo cho PetEye trong thời gian sớm nhất để được hỗ trợ.</p>
      </section>

      <section>
        <h3 className="text-2xl font-bold text-slate-900 mb-4">9. Thông tin liên hệ</h3>
        <p className="mb-3">Nếu có bất kỳ câu hỏi, yêu cầu hoặc khiếu nại nào liên quan đến Chính sách bảo mật này — bao gồm yêu cầu truy cập, chỉnh sửa, hoặc xóa dữ liệu cá nhân — người dùng có thể liên hệ trực tiếp với PetEye qua thông tin được hiển thị bên dưới.</p>
        <p>PetEye cam kết tiếp nhận, xử lý và phản hồi các yêu cầu liên quan đến dữ liệu cá nhân một cách minh bạch, kịp thời và phù hợp với quy định của pháp luật Việt Nam.</p>
      </section>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pt-32 pb-24">
      <div className="max-w-4xl mx-auto px-6">
        
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-6 tracking-tight">
            Chính sách & <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-500">Quy định</span>
          </h1>
          <p className="text-lg text-slate-600 font-medium">Minh bạch, rõ ràng và đặt quyền lợi của người dùng cùng thú cưng lên hàng đầu.</p>
        </div>

        {/* Content Box */}
        <div className="bg-white rounded-[40px] p-8 md:p-12 shadow-xl border border-slate-100">
          
          {/* Tabs */}
          <div className="flex flex-col sm:flex-row gap-4 mb-12 border-b border-slate-100 pb-6">
            <Link 
              to="/terms"
              className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl font-bold text-lg transition-all ${activeTab === 'terms' ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
            >
              <FileText size={20} />
              Điều khoản sử dụng
            </Link>
            <Link 
              to="/privacy"
              className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl font-bold text-lg transition-all ${activeTab === 'privacy' ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
            >
              <Shield size={20} />
              Chính sách bảo mật
            </Link>
          </div>

          {/* Content Body */}
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {activeTab === 'terms' ? termsContent : privacyContent}
          </motion.div>

          {/* Contact Support */}
          <div className="mt-16 pt-8 border-t border-slate-100">
            <div className="bg-blue-50 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="flex-1">
                <h4 className="text-2xl font-black text-slate-900 mb-4">Thông tin liên hệ</h4>
                <div className="space-y-3 text-slate-600 font-medium">
                  <p className="flex items-start gap-3">
                    <span className="font-bold text-slate-900 min-w-[90px]">Địa chỉ:</span> 
                    <span>7 Đ. D1, Tăng Nhơn Phú, Hồ Chí Minh 700000, Vietnam</span>
                  </p>
                  <p className="flex items-start gap-3">
                    <span className="font-bold text-slate-900 min-w-[90px]">Điện thoại:</span> 
                    <a href="tel:0707185436" className="text-blue-600 hover:text-blue-700 hover:underline">070 718 5436</a>
                  </p>
                  <p className="flex items-start gap-3">
                    <span className="font-bold text-slate-900 min-w-[90px]">Email:</span> 
                    <a href="mailto:peteye.contact26@gmail.com" className="text-blue-600 hover:text-blue-700 hover:underline">peteye.contact26@gmail.com</a>
                  </p>
                </div>
              </div>
              <div className="shrink-0 w-full md:w-auto mt-4 md:mt-0">
                <a href="mailto:peteye.contact26@gmail.com" className="flex items-center justify-center px-8 py-4 bg-primary text-white font-bold rounded-full shadow-lg shadow-primary/30 hover:bg-primary-hover hover:shadow-xl hover:-translate-y-1 transition-all duration-300 w-full">
                  Gửi email ngay
                </a>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
