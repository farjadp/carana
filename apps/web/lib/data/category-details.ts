// ============================================================================
// Source: lib/data/category-details.ts
// Version: 1.0.0 — 2026-08-12
// Why: Rich category configuration for subcategories, decision guides, FAQs, and custom filters.
// Env / Identity: Universal (Client/Server)
// ============================================================================

export interface CategoryDetailConfig {
  slug: string;
  name: string;
  icon: string;
  imageUrl: string;
  description: string;
  subcategories: { slug: string; label: string }[];
  specificFilters?: { key: string; label: string; options: { value: string; label: string }[] }[];
  decisionGuide: {
    title: string;
    tips: { title: string; desc: string }[];
  };
  faqs: { question: string; answer: string }[];
}

export const CATEGORY_DETAILS: Record<string, CategoryDetailConfig> = {
  "restaurant-cafe": {
    slug: "restaurant-cafe",
    name: "رستوران، کافه و غذا",
    icon: "☕️",
    imageUrl: "/images/categories/restaurant-cafe.svg",
    description: "معرفی بهترین رستوران‌های ایرانی، کافه‌ها، شیرینی‌فروشی‌ها و خدمات کترینگ در شهرها و استان‌های کانادا.",
    subcategories: [
      { slug: "kabab", label: "کبابی و سنتی" },
      { slug: "cafe", label: "کافه و دسر" },
      { slug: "pastry", label: "شیرینی‌فروشی و نانوایی" },
      { slug: "home_food", label: "غذای خانگی" },
      { slug: "catering", label: "کترینگ و تشریفات" },
      { slug: "fast_food", label: "فست‌فود و ساندویچ" },
    ],
    specificFilters: [
      {
        key: "dining_type",
        label: "نوع خدمت‌دهی",
        options: [
          { value: "dine_in", label: "حضوری (Dine-in)" },
          { value: "takeout", label: "بیرون‌بر (Takeout)" },
          { value: "delivery", label: "ارسال (Delivery)" },
          { value: "catering", label: "کترینگ (Catering)" },
        ],
      },
      {
        key: "dietary",
        label: "ویژگی‌های غذایی",
        options: [
          { value: "halal", label: "حلال (Halal)" },
          { value: "vegetarian", label: "گیاه‌خواری (Vegetarian)" },
        ],
      },
    ],
    decisionGuide: {
      title: "راهنمای انتخاب رستوران و غذای ایرانی در کانادا",
      tips: [
        {
          title: "نوع سرویس را مشخص کنید",
          desc: "آیا برای پذیرایی در منزل نیاز به کترینگ دارید یا قصد سفارش سریع بیرون‌بر برای روزهای کاری را دارید؟",
        },
        {
          title: "رزرو برای مهمانی‌ها",
          desc: "برای آخر هفته‌ها و شب‌های تعطیل حتماً از قبل نسبت به رزرو میز یا هماهنگی کترینگ اقدام فرمایید.",
        },
      ],
    },
    faqs: [
      {
        question: "آیا رستوران‌ها غذای حلال ارائه می‌دهند؟",
        answer: "بله، بیشتر رستوران‌های ایرانی کانادا گوشت حلال سرو می‌کنند. فیلتر «حلال» را فعال کنید تا موارد تایید شده را ببینید.",
      },
      {
        question: "چگونه برای کترینگ و مجالس سفارش دهیم؟",
        answer: "می‌توانید مستقیماً از طریق شماره تماس یا واتساپ ثبت‌شده در پروفایل کسب‌وکار با مدیریت تماس بگیرید.",
      },
    ],
  },

  "medical-clinic": {
    slug: "medical-clinic",
    name: "پزشکی، دندانپزشکی و سلامت",
    icon: "🩺",
    imageUrl: "/images/categories/medical-clinic.svg",
    description: "دایرکتوری پزشکان خانواده، دندانپزشکان، روانشناسان و کلینیک‌های سلامت فارسی‌زبان در کانادا.",
    subcategories: [
      { slug: "family_doc", label: "پزشک خانواده" },
      { slug: "dentist", label: "دندانپزشک" },
      { slug: "psychologist", label: "روانشناس و مشاور" },
      { slug: "physio", label: "فیزیوتراپی و ماساژ درمانی" },
      { slug: "pharmacy", label: "داروخانه" },
      { slug: "dermatology", label: "پوست و مو" },
    ],
    specificFilters: [
      {
        key: "accepting_patients",
        label: "وضعیت پذیرش",
        options: [
          { value: "accepting", label: "پذیرش بیمار جدید" },
          { value: "virtual", label: "ویزیت آنلاین / تلفنی" },
        ],
      },
      {
        key: "insurance",
        label: "پوشش بیمه",
        options: [
          { value: "ohip_ramq", label: "بیمه استانی (OHIP / RAMQ / MSP)" },
          { value: "private", label: "بیمه تکمیلی / خصوصی" },
        ],
      },
    ],
    decisionGuide: {
      title: "راهنمای انتخاب کلینیک و متخصص سلامت فارسی‌زبان",
      tips: [
        {
          title: "بررسی مجوز فعالیت (License)",
          desc: "پزشکان و دندانپزشکان رسمی عضو کالج‌های استانی کانادا (مانند CPSO یا RCDSO) هستند.",
        },
        {
          title: "نیاز به معرفی‌نامه (Referral)",
          desc: "تعدادی از متخصصان نیاز به معرفی‌نامه از پزشک خانواده دارند، در حالی که دندانپزشکان و روانشناسان نیازی به Referral ندارند.",
        },
      ],
    },
    faqs: [
      {
        question: "آیا پزشک خانواده فارسی‌زبان بیمار جدید می‌پذیرد؟",
        answer: "با استفاده از فیلتر «پذیرش بیمار جدید» می‌توانید پزشکانی که امکان ثبت‌نام بیمار جدید دارند را مشاهده کنید.",
      },
      {
        question: "آیا ویزیت‌های روانشناسی شامل بیمه می‌شود؟",
        answer: "بیشتر بیمه‌های تکمیلی شغلی (Extended Health Care) هزینه‌های روانشناس کارشناس ارشد و دکتری را پوشش می‌دهند.",
      },
    ],
  },

  "legal-immigration": {
    slug: "legal-immigration",
    name: "حقوقی و وکالت",
    icon: "⚖️",
    imageUrl: "/images/categories/legal-immigration.svg",
    description: "وکلا و مشاوران رسمی مهاجرت کانادا (RCIC)، وکلای دادگستری، حقوق تجارت، خانواده و املاک.",
    subcategories: [
      { slug: "immigration_lawyer", label: "وکیل مهاجرت" },
      { slug: "rcic", label: "مشاور رسمی مهاجرت (RCIC)" },
      { slug: "family_law", label: "حقوق خانواده و طلاق" },
      { slug: "business_law", label: "حقوق تجارت و شرکت‌ها" },
      { slug: "realestate_law", label: "وکیل نقل و انتقال املاک" },
      { slug: "notary", label: "دفتر اسناد رسمی (Notary Public)" },
    ],
    specificFilters: [
      {
        key: "license_type",
        label: "نوع مجوز",
        options: [
          { value: "bar_lawyer", label: "وکیل دادگستری (Law Society Member)" },
          { value: "rcic_member", label: "مشاور رسمی CICC (RCIC)" },
        ],
      },
      {
        key: "consultation",
        label: "جلسه ارزیابی",
        options: [
          { value: "free_eval", label: "ارزیابی اولیه رایگان" },
          { value: "online_meeting", label: "مشاوره آنلاین تصویری" },
        ],
      },
    ],
    decisionGuide: {
      title: "نکات مهم قبل از انعقاد قرارداد حقوقی و مهاجرتی",
      tips: [
        {
          title: "تفاوت وکیل دادگستری و مشاور مهاجرت",
          desc: "وکیل دادگستری (Lawyer) امکان دفاع در دادگاه‌های استان و فدرال را دارد؛ مشاور RCIC تحت نظارت سازمان CICC پرونده‌های مهاجرتی را مدیریت می‌کند.",
        },
        {
          title: "استعلام شماره لایسنس",
          desc: "همواره شماره ثبت مشاور را در وب‌سایت رسمی CICC یا Law Society استان مربوطه استعلام نمایید.",
        },
      ],
    },
    faqs: [
      {
        question: "چگونه از معتبر بودن مشاور مهاجرت مطمئن شوم؟",
        answer: "تمامی مشاوران رسمی دارای کد RCIC چندرقمی هستند که می‌توانید در سایت سازمان CICC استعلام بگیرید.",
      },
      {
        question: "آیا امکان مشاوره از ایران وجود دارد؟",
        answer: "بله، اکثر وکلا و مشاوران خدمات مشاوره آنلاین از طریق Zoom یا گوگل میت ارائه می‌دهند.",
      },
    ],
  },

  "real-estate-mortgage": {
    slug: "real-estate-mortgage",
    name: "املاک و وام",
    icon: "🏠",
    imageUrl: "/images/categories/real-estate-mortgage.svg",
    description: "مشاوران املاک باسابقه، متخصصان وام مسکن (Mortgage Specialists)، اجاره و املاک تجاری در کانادا.",
    subcategories: [
      { slug: "realtor", label: "مشاور خرید و فروش املاک" },
      { slug: "mortgage_broker", label: "متخصص وام مسکن (Mortgage)" },
      { slug: "rental", label: "اجاره و مدیریت املاک" },
      { slug: "commercial_realty", label: "املاک تجاری و بیزینس" },
      { slug: "pre_construction", label: "پیش‌خرید و پیش‌ساخت" },
    ],
    specificFilters: [
      {
        key: "property_type",
        label: "نوع ملک",
        options: [
          { value: "residential", label: "مسکونی (Residential)" },
          { value: "commercial", label: "تجاری (Commercial)" },
        ],
      },
    ],
    decisionGuide: {
      title: "راهنمای خرید، اجاره و دریافت وام مسکن در کانادا",
      tips: [
        {
          title: "پیش‌تاییدیه وام (Pre-Approval)",
          desc: "قبل از جستجوی ملک، حتماً با مشاور وام میزان توانمندی وام و نرخ بهره پرداختی را مشخص کنید.",
        },
        {
          title: "خدمات رایگان برای خریدار",
          desc: "در کانادا، کمیسیون مشاور املاک معمولاً توسط فروشنده پرداخت می‌شود و خدمات خریدار رایگان است.",
        },
      ],
    },
    faqs: [
      {
        question: "حداقل پیش‌پرداخت (Down Payment) خرید خانه چقدر است؟",
        answer: "برای خانه تا ۵۰۰ هزار دلار، حداقل ۵٪ و برای مبالغ بالاتر درصد متغیری نیاز است.",
      },
      {
        question: "آیا تازه‌واردین می‌توانند وام مسکن بگیرند؟",
        answer: "بله، برنامه‌های مشخصی برای Newcomers با حداقل ۳۵٪ پیش‌پرداخت و بدون سابقه کار طولانی وجود دارد.",
      },
    ],
  },

  "accounting-tax": {
    slug: "accounting-tax",
    name: "مالی، حسابداری و بیمه",
    icon: "📊",
    imageUrl: "/images/categories/accounting-tax.svg",
    description: "حسابداران رسمی (CPA)، مشاوران مالیاتی شخصی و شرکتی، دفاتر بیمه عمر و سرمایه‌گذاری.",
    subcategories: [
      { slug: "personal_tax", label: "مالیات شخصی (Personal Tax)" },
      { slug: "corporate_tax", label: "مالیات شرکت‌ها (Corporate)" },
      { slug: "bookkeeping", label: "دفترداری و حقوق و دستمزد" },
      { slug: "insurance_agent", label: "مشاور بیمه عمر و درمان" },
      { slug: "financial_planner", label: "برنامه‌ریزی مالی و سرمایه‌گذاری" },
    ],
    specificFilters: [
      {
        key: "cpa_status",
        label: "تخصص مالی",
        options: [
          { value: "cpa", label: "حسابدار رسمی (CPA)" },
          { value: "self_employed", label: "تخصص مشاغل آزاد (Self-Employed)" },
        ],
      },
    ],
    decisionGuide: {
      title: "راهنمای تنظیم اظهارنامه مالیاتی و امور حسابداری",
      tips: [
        {
          title: "مهلت‌های مالیاتی در کانادا",
          desc: "مهلت ارسال اظهارنامه افراد تا ۳۰ آوریل و افراد دارای بیزینس خویش‌فرما تا ۱۵ ژوئن است.",
        },
        {
          title: "جمع‌آوری مدارک و فاکتورها",
          desc: "تمامی فاکتورهای هزینه‌ای و رسیدهای درمانی را جهت کاهش مالیات نزد خود نگه دارید.",
        },
      ],
    },
    faqs: [
      {
        question: "هزینه تنظیم فایل مالیاتی شخصی چقدر است؟",
        answer: "بسته به تعداد فرم‌ها و پیچیدگی مدارک معمولاً از ۵۰ تا ۲۰۰ دلار متغیر است.",
      },
      {
        question: "آیا فایل کردن اولین سال مالیات ضروری است؟",
        answer: "بله، برای دریافت سوبسیدها و کریدیت‌های دولتی (مانند GST/HST credit) حتماً باید فایل شود.",
      },
    ],
  },

  "beauty-wellness": {
    slug: "beauty-wellness",
    name: "آرایشگری و زیبایی",
    icon: "✨",
    imageUrl: "/images/categories/beauty-wellness.svg",
    description: "سالن‌های زیبایی، آرایشگاه‌های زنانه و مردانه، خدمات پوست، ناخن، لیزر و ماساژ.",
    subcategories: [
      { slug: "hair_salon", label: "آرایشگاه و کوپ مو" },
      { slug: "barber", label: "سلمانی مردانه" },
      { slug: "skincare", label: "پوست و فیشیال" },
      { slug: "nail_art", label: "خدمات ناخن" },
      { slug: "laser", label: "لیزر و اپیلاسیون" },
      { slug: "makeup", label: "میکاپ و خدمات عروس" },
    ],
    decisionGuide: {
      title: "راهنمای رزرو خدمات زیبایی و مراقبت پوستی",
      tips: [
        {
          title: "مشاهده نمونه کارها",
          desc: "قبل از مراجعه حضوری، نمونه‌کارهای ثبت شده در صفحه اینستاگرام یا وب‌سایت مجموعه را بررسی کنید.",
        },
      ],
    },
    faqs: [
      {
        question: "آیا وقت‌دهی آنی وجود دارد؟",
        answer: "برخی سالن‌ها امکان رزرو آنلاین دارند و برخی از طریق پیام مستقیم وقت تنظیم می‌کنند.",
      },
    ],
  },

  "iranian-grocery": {
    slug: "iranian-grocery",
    name: "فروشگاه و خرده‌فروشی",
    icon: "🛒",
    imageUrl: "/images/categories/iranian-grocery.svg",
    description: "سوپرمارکت‌های ایرانی، کتاب‌فروشی، صنایع دستی، خشکبار و فروشگاه‌های آنلاین بسته‌های ایرانی.",
    subcategories: [
      { slug: "supermarket", label: "سوپرمارکت مواد غذایی" },
      { slug: "nuts_dried_fruit", label: "خشکبار و زعفران" },
      { slug: "bookstore", label: "کتاب و لوازم التحریر" },
      { slug: "handicrafts", label: "صنایع دستی و فرش" },
    ],
    decisionGuide: {
      title: "راهنمای خرید محصولات ارگانیک و اصیل ایرانی",
      tips: [
        {
          title: "ارسال به سراسر کانادا",
          desc: "بسیاری از سوپرمارکت‌های آنلاین خشکبار و نان تازه را به استان‌های مختلف پست می‌کنند.",
        },
      ],
    },
    faqs: [
      {
        question: "آیا ارسال رایگان مواد غذایی وجود دارد؟",
        answer: "اکثر فروشگاه‌ها بالای مبلغ مشخصی (مثلاً ۷۵ دلار) ارسال رایگان شهری دارند.",
      },
    ],
  },

  "education": {
    slug: "education",
    name: "آموزش و تدریس",
    icon: "📚",
    imageUrl: "/images/categories/education.svg",
    description: "آموزش زبان انگلیسی و فرانسوی، آموزش موسیقی، کنکور، ریاضیات و کلاس‌های تقویتی کودکان.",
    subcategories: [
      { slug: "language", label: "آموزش زبان (IELTS / CELPIP)" },
      { slug: "music", label: "آموزش موسیقی و ساز" },
      { slug: "tutoring", label: "تدریس خصوصی مدرسه و دانشگاه" },
      { slug: "kids_classes", label: "کلاس‌های آموزشی کودکان" },
    ],
    decisionGuide: {
      title: "راهنمای انتخاب استاد و کلاس آموزشی",
      tips: [
        {
          title: "جلسه ارزیابی رایگان",
          desc: "پیش از ثبت‌نام ترمیک، در خواست یک جلسه مشاوره یا تست تعیین سطح اولیه داشته باشید.",
        },
      ],
    },
    faqs: [
      {
        question: "کلاس‌ها آنلاین برگزار می‌شوند یا حضوری؟",
        answer: "هر دو حالت وجود دارد. می‌توانید با فیلتر نوع خدمت‌دهی موارد آنلاین یا حضوری را جدا کنید.",
      },
    ],
  },

  "skilled-trades": {
    slug: "skilled-trades",
    name: "ساختمان و تاسیسات",
    icon: "🔧",
    imageUrl: "/images/categories/skilled-trades.svg",
    description: "خدمات لوله‌کشی، برق‌کاری، بازسازی منزل، نقاشی ساختمان و خدمات فنی فوری.",
    subcategories: [
      { slug: "renovation", label: "بازسازی و دکوراسیون" },
      { slug: "plumbing", label: "لوله‌کشی و تاسیسات" },
      { slug: "electrician", label: "برق‌کاری و روشنایی" },
      { slug: "painting", label: "نقاشی و کاغذ دیواری" },
      { slug: "hvac", label: "گرمایش و سرمایش (HVAC)" },
    ],
    decisionGuide: {
      title: "نکات مهم در برقراری قراردادهای بازسازی و خدمات فنی",
      tips: [
        {
          title: "بیمه مسوولیت و WSIB",
          desc: "مطمئن شوید پیمانکار دارای بیمه مسوولیت کاری (Liability Insurance) باشد.",
        },
      ],
    },
    faqs: [
      {
        question: "آیا بازدید اولیه برای قیمت‌دهی رایگان است؟",
        answer: "بیشتر استادکاران در محدوده شهری بازدید اولیه و ارائه Quote را بدون هزینه انجام می‌دهند.",
      },
    ],
  },

  "events": {
    slug: "events",
    name: "رویدادها و تشریفات",
    icon: "🎟️",
    imageUrl: "/images/categories/events.svg",
    description: "کنسرت‌ها، جُنگ‌های خنده، همایش‌های تجاری، نمایشگاه‌ها و شب‌های شعر ایرانی در کانادا.",
    subcategories: [
      { slug: "concert", label: "کنسرت و اجرای زنده" },
      { slug: "exhibition", label: "نمایشگاه و بازارچه" },
      { slug: "seminar", label: "همایش و سمینار بیزینسی" },
      { slug: "family_event", label: "رویدادهای خانوادگی و کودک" },
    ],
    decisionGuide: {
      title: "راهنمای شرکت و رزرو بلیت رویدادهای ایرانیان",
      tips: [
        {
          title: "خرید زودهنگام (Early Bird)",
          desc: "برای کنسرت‌ها و همایش‌ها با خرید زودهنگام بلیت می‌توانید از تخفیف‌های ویژه استفاده کنید.",
        },
      ],
    },
    faqs: [
      {
        question: "چگونه رویداد خود را در چارانا قرار دهم؟",
        answer: "از طریق فرم ثبت کسب‌وکار/رویداد در پایانی صفحه، رویداد خود را برای بررسی تیم ارسال کنید.",
      },
    ],
  },
};

export function getCategoryDetail(slug: string): CategoryDetailConfig {
  return CATEGORY_DETAILS[slug] || {
    slug: slug,
    name: "دسته‌بندی مشاغل",
    icon: "🏢",
    imageUrl: "/images/categories/skilled-trades.svg",
    description: "لیست جامع کسب‌وکارهای ایرانیان کانادا در این دسته‌بندی.",
    subcategories: [
      { slug: "general", label: "خدمات عمومی" },
      { slug: "specialized", label: "خدمات تخصصی" },
    ],
    decisionGuide: {
      title: "راهنمای انتخاب خدمات",
      tips: [
        { title: "اطلاعات شفاف", desc: "قبل از تصمیم‌گیری مشخصات و امتیازهای ثبت شده را مطالعه کنید." }
      ]
    },
    faqs: [
      { question: "آیا کسب‌وکارهای این دسته تاییدشده هستند؟", answer: "بله، تمام موارد توسط تیم پشتیبانی بررسی اولیه می‌شوند." }
    ]
  };
}
