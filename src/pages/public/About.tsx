import React, { useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Shield, Heart, Zap, Users, ArrowRight, Briefcase, Handshake, Newspaper, Eye, CheckCircle2, Star, Clock, Target, Check, Video, Quote
} from 'lucide-react';

export default function About() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const fadeIn = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: "easeOut" } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2 }
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen overflow-hidden">
      
      {/* 1. Brand Story - Image Background with Text Overlay */}
      <section className="relative pt-40 pb-32 md:pt-56 md:pb-48 flex items-center justify-center overflow-hidden bg-slate-900">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <img 
            src="/images/about_brand_story.png" 
            alt="Người chơi với thú cưng" 
            className="w-full h-full object-cover object-center opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900/80 via-slate-900/50 to-slate-900/90"></div>
        </div>

        <div className="max-w-5xl mx-auto px-6 relative z-10 text-center">
          <motion.div initial="hidden" animate="visible" variants={fadeIn}>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md text-white font-semibold rounded-full text-sm mb-8 border border-white/20 shadow-lg">
              <Heart size={16} className="text-rose-400" /> Câu chuyện thương hiệu
            </div>
            <h2 className="text-5xl md:text-6xl lg:text-7xl font-black text-white mb-8 leading-tight drop-shadow-xl tracking-tight">
              Khởi nguồn từ tình yêu với <br className="hidden md:block"/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-300">những người bạn nhỏ</span>
            </h2>
            <div className="space-y-6 text-xl md:text-2xl text-slate-200 leading-relaxed font-medium max-w-4xl mx-auto">
              <p>
                Khởi nguồn từ một trăn trở đơn giản: Làm thế nào để tìm được cơ sở thú y, spa uy tín một cách nhanh chóng và có thể theo dõi thú cưng của mình mọi lúc mọi nơi?
              </p>
              <p>
                Chúng tôi hiểu rằng, thú cưng không chỉ là vật nuôi, mà là một thành viên quan trọng trong gia đình. Vì vậy, PetEye tiên phong ứng dụng công nghệ để tạo ra một môi trường minh bạch, nơi bạn có thể yên tâm gửi gắm trọn vẹn tình yêu thương.
              </p>
            </div>
          </motion.div>
        </div>
        
        {/* Wave transition bottom */}
        <div className="absolute -bottom-[2px] left-0 w-full overflow-hidden leading-none z-10 rotate-180">
            <svg className="relative block w-full h-[50px] text-slate-50" viewBox="0 0 1200 120" preserveAspectRatio="none">
                <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" fill="currentColor"></path>
            </svg>
        </div>
      </section>

      {/* 2. Vision & Core Values - Staggered Layout */}
      <section className="py-24 md:py-32 bg-slate-50 relative">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20">
          
          {/* Vision Block - Left Aligned */}
          <motion.div 
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn}
            className="max-w-3xl mb-32 relative"
          >
            <div className="absolute -left-10 -top-10 text-[120px] text-blue-500/10 font-serif leading-none">"</div>
            <h2 className="text-5xl md:text-6xl lg:text-7xl font-black text-slate-900 leading-tight mb-8 tracking-tighter relative z-10">
              Trở thành một trong những <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-500 pb-2">nền tảng công nghệ đáng tin cậy</span> hàng&nbsp;đầu.
            </h2>
            <p className="text-2xl md:text-3xl text-slate-600 font-medium leading-relaxed relative z-10">
              Kết nối chủ nuôi với hệ sinh thái dịch vụ thú cưng minh bạch và chất lượng.
            </p>
            <div className="mt-8 flex items-center gap-4">
              <div className="w-16 h-1 bg-gradient-to-r from-primary to-blue-500 rounded-full"></div>
              <div className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-500 uppercase tracking-widest">Tầm nhìn PetEye</div>
            </div>
          </motion.div>

          {/* Core Values - Staggered Grid */}
          <div className="flex flex-col md:flex-row justify-between items-end gap-10">
            <div className="md:w-1/3 mb-12 md:mb-0">
               <h3 className="text-6xl md:text-7xl lg:text-8xl font-black text-slate-900 leading-none tracking-tighter mb-4">Giá trị<br/><span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-500 pb-2">cốt lõi</span></h3>
               <p className="text-slate-500 font-medium text-lg">Những trụ cột vững chắc tạo nên sự khác biệt của chúng tôi.</p>
            </div>
            
            <motion.div 
              variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }}
              className="md:w-2/3 grid sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8"
            >
              {[
                { icon: Shield, title: "Minh bạch", desc: "Thông tin xác thực, đánh giá thực tế, theo dõi trực tuyến.", color: "text-blue-600", bg: "bg-blue-50", offset: "lg:-translate-y-12" },
                { icon: CheckCircle2, title: "Tin cậy", desc: "Mọi đối tác được sàng lọc nghiêm ngặt vì sự an toàn.", color: "text-emerald-600", bg: "bg-emerald-50", offset: "lg:translate-y-0" },
                { icon: Zap, title: "Thuận tiện", desc: "Tìm kiếm, so sánh và đặt lịch dễ dàng trên một nền tảng.", color: "text-purple-600", bg: "bg-purple-50", offset: "lg:translate-y-12" }
              ].map((val, i) => (
                <motion.div key={i} variants={fadeIn} className={`bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 ${val.offset} hover:-translate-y-2 transition-transform duration-300`}>
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 ${val.bg} ${val.color}`}>
                    <val.icon size={28} />
                  </div>
                  <h4 className="text-2xl font-bold text-slate-900 mb-3">{val.title}</h4>
                  <p className="text-slate-600 font-medium leading-relaxed">{val.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>

        </div>
      </section>

      {/* 3. Why Choose PetEye - Compact Staggered Left/Right alternating */}
      <section className="py-16 md:py-20 bg-white relative overflow-hidden">
        {/* Background decors */}
        <div className="absolute top-40 right-0 w-64 h-64 bg-orange-100 rounded-full blur-[80px] -z-10"></div>
        <div className="absolute bottom-40 left-0 w-64 h-64 bg-blue-100 rounded-full blur-[80px] -z-10"></div>

        <div className="max-w-6xl mx-auto px-6 md:px-12 lg:px-20">
          <div className="text-center max-w-3xl mx-auto mb-16 md:mb-20">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 mb-6 tracking-tighter">
              Vì sao hàng nghìn chủ nuôi <br className="hidden md:block"/>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-500 pb-2">lựa chọn PetEye?</span>
            </h2>
          </div>

          <div className="space-y-16 md:space-y-20">
            {[
              { icon: Shield, title: "Đối tác được xác thực", desc: "Chúng tôi kiểm duyệt thông tin và tiêu chuẩn hoạt động trước khi đưa đối tác lên nền tảng.", color: "text-blue-500", bg: "bg-blue-50", align: "left" },
              { icon: Video, title: "Theo dõi trực tuyến", desc: "Xem thú cưng mọi lúc tại các cơ sở hỗ trợ Camera Monitoring.", color: "text-rose-500", bg: "bg-rose-50", align: "right" },
              { icon: Star, title: "Đánh giá minh bạch", desc: "Tham khảo phản hồi thực tế từ cộng đồng chủ nuôi một cách khách quan.", color: "text-amber-500", bg: "bg-amber-50", align: "left" },
              { icon: Clock, title: "Đặt lịch nhanh chóng", desc: "Tìm kiếm, so sánh và đặt lịch chỉ trong vài phút.", color: "text-emerald-500", bg: "bg-emerald-50", align: "right" }
            ].map((feature, i) => (
              <motion.div 
                key={i} 
                initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={fadeIn}
                className={`flex flex-col md:flex-row items-center gap-6 md:gap-12 ${feature.align === 'right' ? 'md:flex-row-reverse' : ''}`}
              >
                <div className="md:w-5/12 flex justify-center">
                   <div className={`w-32 h-32 md:w-48 md:h-48 rounded-full flex items-center justify-center ${feature.bg} ${feature.color} shadow-xl shadow-slate-200/50 relative group`}>
                      <div className="absolute inset-0 bg-white/40 rounded-full blur-xl group-hover:blur-2xl transition-all duration-500"></div>
                      <feature.icon size={64} className="relative z-10 group-hover:scale-110 transition-transform duration-500" />
                   </div>
                </div>
                <div className={`md:w-7/12 text-center md:text-left ${feature.align === 'right' ? 'md:text-right' : ''}`}>
                  <h4 className="text-2xl md:text-3xl font-black text-slate-900 mb-3">{feature.title}</h4>
                  <p className="text-lg text-slate-600 leading-relaxed font-medium">{feature.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

        </div>
      </section>

      {/* 4. Commitments - Diagonal split or staggered */}
      <section className="py-24 md:py-32 bg-slate-900 relative overflow-hidden">
        {/* Custom shape divider top */}
        <div className="absolute top-0 left-0 w-full overflow-hidden leading-none z-10">
            <svg className="relative block w-full h-[40px] text-white" viewBox="0 0 1200 120" preserveAspectRatio="none">
                <path d="M1200 0L0 0 0 40 1200 0z" fill="currentColor"></path>
            </svg>
        </div>

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/40 via-transparent to-transparent"></div>

        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20 relative z-10 pt-10">
          <div className="grid lg:grid-cols-12 gap-16 items-center">
            
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn} className="lg:col-span-5">
              <h2 className="text-5xl md:text-6xl font-black text-white mb-6 tracking-tighter">Cam kết <br/> của PetEye</h2>
              <div className="w-20 h-2 bg-blue-500 mb-8 rounded-full"></div>
              <p className="text-3xl text-blue-400 font-bold mb-6">Minh bạch trong mọi quyết định</p>
              <p className="text-xl text-slate-400 font-medium leading-relaxed italic border-l-4 border-slate-700 pl-6">
                "Chúng tôi tin rằng sự an tâm bắt đầu từ việc nhìn thấy và hiểu rõ nơi bạn gửi gắm thú&nbsp;cưng."
              </p>
            </motion.div>

            <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }} className="lg:col-span-7 grid sm:grid-cols-2 gap-6">
              {[
                "Hiển thị thông tin đối tác rõ ràng",
                "Khuyến khích đánh giá thực tế",
                "Hỗ trợ giải quyết khiếu nại công bằng",
                "Liên tục nâng cao tiêu chuẩn đối tác"
              ].map((item, i) => (
                <motion.div key={i} variants={fadeIn} className={`bg-slate-800/50 backdrop-blur-md border border-slate-700 p-8 rounded-3xl hover:bg-slate-800 transition-colors ${i % 2 !== 0 ? 'sm:translate-y-12' : ''}`}>
                  <div className="w-14 h-14 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center mb-6">
                    <Check size={28} strokeWidth={3} />
                  </div>
                  <h4 className="text-xl font-bold text-white">{item}</h4>
                </motion.div>
              ))}
            </motion.div>

          </div>
        </div>
      </section>

      {/* 5. Partner CTA - Floating Staggered Box */}
      <section className="py-32 bg-slate-50 relative">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20">
          <div className="relative bg-white rounded-[3rem] p-12 md:p-20 shadow-2xl shadow-blue-900/5 overflow-hidden">
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-orange-100 rounded-full blur-[80px]"></div>
            <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-100 rounded-full blur-[80px]"></div>

            <div className="grid lg:grid-cols-2 gap-16 relative z-10 items-center">
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn}>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-600 font-bold rounded-full text-sm mb-8 uppercase tracking-wider">
                  <Handshake size={16} /> Dành cho Doanh nghiệp
                </div>
                <h2 className="text-5xl md:text-6xl lg:text-7xl font-black text-slate-900 mb-8 leading-tight tracking-tighter">
                  Trở thành đối tác chiến lược cùng <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-500 pb-2">PetEye</span>
                </h2>
                <p className="text-xl text-slate-600 leading-relaxed font-medium mb-10">
                  Bạn là chủ phòng khám thú y, spa hay dịch vụ lưu trú? Tham gia mạng lưới PetEye để tiếp cận hàng ngàn khách hàng tiềm năng, tối ưu quy trình quản lý và nâng tầm thương hiệu.
                </p>
                <Link to="/shop/register" className="inline-flex items-center gap-3 bg-slate-900 text-white px-10 py-5 rounded-full text-lg font-bold hover:bg-blue-600 transition-colors shadow-xl hover:-translate-y-1">
                  Đăng ký đối tác ngay
                  <ArrowRight size={20} />
                </Link>
              </motion.div>

              <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid grid-cols-2 gap-6">
                <motion.div variants={fadeIn} className="bg-white p-8 rounded-3xl shadow-lg shadow-slate-200/50 border border-slate-100 text-center">
                  <div className="text-5xl font-black text-slate-900 mb-2">200+</div>
                  <div className="text-slate-500 font-bold">Đối tác</div>
                </motion.div>
                <motion.div variants={fadeIn} className="bg-white p-8 rounded-3xl shadow-lg shadow-slate-200/50 border border-slate-100 text-center translate-y-8">
                  <div className="text-5xl font-black text-blue-600 mb-2">15+</div>
                  <div className="text-slate-500 font-bold">Thành phố</div>
                </motion.div>
                <motion.div variants={fadeIn} className="bg-white p-8 rounded-3xl shadow-lg shadow-slate-200/50 border border-slate-100 text-center">
                  <div className="text-5xl font-black text-orange-600 mb-2">50k+</div>
                  <div className="text-slate-500 font-bold">Khách hàng</div>
                </motion.div>
                <motion.div variants={fadeIn} className="bg-white p-8 rounded-3xl shadow-lg shadow-slate-200/50 border border-slate-100 text-center translate-y-8">
                  <div className="text-5xl font-black text-emerald-600 mb-2">98%</div>
                  <div className="text-slate-500 font-bold">Đánh giá tốt</div>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
