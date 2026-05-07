/* ═══════════════════════════════════════════════
   دليل الميسّرات والميسّرين — Full-Site Search
   ═══════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── Arabic text normalisation ───────────────── */
  function norm(t) {
    if (!t) return '';
    return t
      .replace(/[ً-ٰٟ]/g, '')   // strip tashkeel
      .replace(/[آأإٱ]/g, 'ا') // alef variants → ا
      .replace(/ة/g, 'ه')              // teh marbuta → ه
      .replace(/ى/g, 'ي')              // alef maqsura → ي
      .replace(/ؤ/g, 'و')              // waw+hamza → و
      .replace(/ئ/g, 'ي')              // yeh+hamza → ي
      .toLowerCase()
      .trim();
  }

  /* ── Escape HTML ─────────────────────────────── */
  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ── Highlight query inside text ─────────────── */
  function highlight(text, query) {
    if (!text || !query.trim()) return esc(text || '');
    const nT = norm(text);
    const words = norm(query).split(/\s+/).filter(Boolean);
    let result = esc(text);
    // We work on normalized positions; rebuild highlighted original
    for (const word of words) {
      let idx = nT.indexOf(word);
      if (idx === -1) continue;
      const original = esc(text.substring(idx, idx + word.length));
      result = result.replace(original, `<mark>${original}</mark>`);
    }
    return result;
  }

  /* ── Short content snippet ───────────────────── */
  function snippet(content, query, maxLen) {
    maxLen = maxLen || 110;
    const nC = norm(content);
    const nQ = norm(query).split(/\s+/)[0] || '';
    const idx = nC.indexOf(nQ);
    let start = idx > 45 ? idx - 45 : 0;
    let excerpt = content.substring(start, start + maxLen);
    if (start > 0) excerpt = '…' + excerpt;
    if (start + maxLen < content.length) excerpt += '…';
    return excerpt;
  }

  /* ── Score a single index entry ─────────────── */
  function score(item, query) {
    const nQ    = norm(query);
    const words = nQ.split(/\s+/).filter(Boolean);
    const nTit  = norm(item.title);
    const nCon  = norm(item.content);
    const nSec  = norm(item.section);
    let s = 0;

    if (nTit === nQ)               s += 120;
    else if (nTit.startsWith(nQ))  s += 70;
    else if (nTit.includes(nQ))    s += 45;

    if (nCon.includes(nQ))  s += 18;
    if (nSec.includes(nQ))  s += 8;

    for (const w of words) {
      if (w.length < 2) continue;
      if (nTit.includes(w)) s += 12;
      if (nCon.includes(w)) s += 4;
    }
    return s;
  }

  /* ── Type meta ───────────────────────────────── */
  var TYPE = {
    section:   { label: 'قسم',    color: 'green', icon: '<path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>' },
    page:      { label: 'صفحة',   color: 'green', icon: '<path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>' },
    principle: { label: 'مبدأ',   color: 'pink',  icon: '<path d="M12 2l3 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77 5.82 21l1.18-6.88L2 9.27l7-.01L12 2z" fill="currentColor"/>' },
    activity:  { label: 'نشاط',   color: 'teal',  icon: '<rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' },
    session:   { label: 'لقاء',   color: 'green', icon: '<circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 7v5l3.5 3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' },
    emotion:   { label: 'مشاعر',  color: 'pink',  icon: '<circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 14s1.5 2 4 2 4-2 4-2" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round"/><circle cx="9" cy="10" r="1.2" fill="currentColor"/><circle cx="15" cy="10" r="1.2" fill="currentColor"/>' },
    'pfa-stage':{ label: 'PFA',   color: 'pink',  icon: '<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor"/>' },
    topic:     { label: 'موضوع',  color: 'teal',  icon: '<path d="M4 6h16M4 11h16M4 16h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' },
    behavior:  { label: 'سلوك',   color: 'teal',  icon: '<path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" fill="currentColor"/>' },
  };

  function typeMeta(t) { return TYPE[t] || TYPE.topic; }

  /* ══════════════════════════════════════════════
     SEARCH INDEX — all indexed content
     ══════════════════════════════════════════════ */
  var INDEX = [
    /* ── Home ── */
    { id:'home', route:'#/', section:'الرئيسية', title:'دليل الميسرات والميسرين', content:'دليل الميسرات والميسرين إجراءات توجيهية في العمل مع مجموعات الأطفال في الطوارئ والأزمات باستخدام نهج الإسعاف النفسي الأولي PFA الدعم النفسي والاجتماعي 2026', type:'page' },
    { id:'intro', route:'#/about', section:'مقدمة', title:'مقدمة — مشروع مدرسة البلد', content:'مشروع مدرسة البلد مركز التعليم المستمر في جامعة بيرزيت منظمة الأمم المتحدة للطفولة اليونيسف UNICEF دعم التعلم وتعزيز رفاهية الأطفال في المناطق التي تعاني من الاعتداءات المستمرة من المستوطنين والاحتلال في جنوب نابلس الدعم النفسي والاجتماعي 2000 طفل وطفلة مراكز التعلم المجتمعي جالود قريوت قصرة اللبن الشرقية الساوية حلول تعليمية مبتكرة', type:'section' },
    { id:'goals', route:'#/about', section:'أهداف المشروع', title:'أهداف المشروع', content:'تعزيز التعلم والدعم النفسي والاجتماعي للأطفال من الفئة العمرية 6 – 15 سنة بناء قدرات مراكز التعلم المجتمعي استدامة الخدمات التعليمية تطوير حلول تعليمية مبتكرة تتناسب مع احتياجات المجتمع', type:'section' },
    { id:'guide-about', route:'#/about', section:'عن الدليل', title:'عن الدليل', content:'الدليل لميسري جلسات الدعم النفسي الاجتماعي الجماعية مشروع مدرسة البلد الأطفال من 6 إلى 15 عاماً الأزمات والطوارئ الإسعاف النفسي الأولي بيئة آمنة أمان مراكز مجتمعية مدارس التعبير عن المشاعر التكيف مع التحديات النفسية والاجتماعية الميسرون حضور داعم آمن إحالة الجهات المختصة', type:'section' },
    { id:'conclusion-home', route:'#/conclusion', section:'الخاتمة', title:'خاتمة', content:'العمل مع الأطفال في سياقات الأزمات بيئة آمنة وداعمة أنشطة مبنية على مبادئ الإسعاف النفسي الأولي الاستماع الإصغاء الطمأنة تقدير المشاعر وجودكم الآمن الداعم يصنع الفرق', type:'section' },

    /* ── Principles ── */
    { id:'principles', route:'#/principles', section:'المبادئ العامة', title:'المبادئ العامة', content:'المبادئ الأساسية عند العمل مع الأطفال في سياق الأزمات إطار لكيفية تواجدك مع الأطفال وبناء علاقة آمنة أمان', type:'section' },
    { id:'p1-safety', route:'#/principles', section:'المبادئ العامة', title:'أولاً: لنؤمن بيئة آمنة', content:'لنؤمن بيئة آمنة أمان سلامة لنتحقق من المخاطر وننظم مكان العمل لضمن سلامة المشاركين روتين هادئ وثابت لا للمحتوى المثير للقلق رواية القصص والأحداث المؤلمة قواعد جماعية واضحة الاحترام المتبادل الاستماع بانتباه لا للتنمر والسلوك العنيف الاستجابة لطلب الميسر', type:'principle' },
    { id:'p2-trust', route:'#/principles', section:'المبادئ العامة', title:'ثانياً: لنبن الثقة والعلاقة والتواصل الآمن', content:'لنبن الثقة والعلاقة والتواصل الآمن أمان دفء واحترام وانفتاح لغة ونبرة مناسبة لأعمار الأطفال خلفياتهم الثقافية والشخصية', type:'principle' },
    { id:'p3-expression', route:'#/principles', section:'المبادئ العامة', title:'ثالثاً: لندعم التعبير العاطفي', content:'لندعم التعبير العاطفي وسائل متنوعة الرسم اللعب القصص المناقشات لنشجع المشاركة بلطف لا للإجبار من الطبيعي أن نشعر بالخوف أو الحزن أو الغضب مشاعر طبيعية', type:'principle' },

    /* ── Group Management ── */
    { id:'group-mgmt', route:'#/group-management', section:'تكوين المجموعة', title:'تكوين المجموعة وتعزيز الدمج وشمل الجميع', content:'تكوين المجموعة وتعزيز الدمج وشمل الجميع الفئات العمرية أساليب تفاعل مختلفة اختيار نوع النشاط المناسب استجابات الأطفال', type:'section' },
    { id:'gm-ages', route:'#/group-management', section:'تكوين المجموعة', title:'الفئات العمرية', content:'لنقسم حسب الفئة العمرية 6-8 سنوات لعب أنشطة حركية بصرية مجموعة صغيرة 9-12 سنة مزج اللعب والمناقشات 13-15 سنة مناقشات يقودها اليافعون مهام إبداعية', type:'topic' },
    { id:'gm-inclusion', route:'#/group-management', section:'تكوين المجموعة', title:'الدمج وشمل جميع أفراد المجموعة', content:'لندعم دمج وشمل جميع أفراد المجموعة تباينات طباع خلفيات قدرات لنتأكد من شعور الجميع بالاندماج احتياجات خاصة الأطفال الهادئين داعمين لطيفين التنمر الإقصاء طرق تفاعل متعددة كلام رسم كتابة عمل جماعي فردي الخصوصية أدوار قيادية منسق ضابط وقت تحمل المسؤولية', type:'topic' },

    /* ── Group Procedures ── */
    { id:'group-proc', route:'#/group-procedures', section:'إجراءات إدارة المجموعة', title:'إجراءات إدارة المجموعة', content:'إجراءات إدارة المجموعة نجاح جلسات الدعم النفسي الاجتماعي الترحيب والانتماء جلسة واضحة منظمة تراعي توازن المشاركة', type:'section' },
    { id:'gp-start', route:'#/group-procedures', section:'إجراءات إدارة المجموعة', title:'أولاً: لنهيئ البداية', content:'لنهيئ البداية لنعرف عن أنفسنا ميسرين كسر الجليد أسئلة مرحة ألعاب تعارف القواعد بشكل جماعي توزيع الأدوار قائد منظم وقت مراقب عاكس محتوى عمل المجموعة خطة الجلسة ماذا سنفعل اليوم نسأل عن حالهم', type:'topic' },
    { id:'gp-run', route:'#/group-procedures', section:'إجراءات إدارة المجموعة', title:'ثانياً: لنباشر الجلسة', content:'لنباشر الجلسة لنراجع الأهداف تجارب بين اللقاءات النشاط الرئيسي نقاش لعبة عمل جماعي التذكير بالمعلومة الأساسية والمهارة المكتسبة أهداف وتوقعات اللقاء', type:'topic' },
    { id:'gp-challenges', route:'#/group-procedures', section:'إجراءات إدارة المجموعة', title:'ثالثاً: لنتوقع التحديات', content:'لنتوقع التحديات من ينسحب أو من يهيمن توزيع المشاركة تقسيم المجموعات توجيه الكلام بالتساوي للجميع', type:'topic' },
    { id:'gp-evaluate', route:'#/group-procedures', section:'إجراءات إدارة المجموعة', title:'رابعاً: لنتابع ونقيم', content:'لنتابع ونقيم في نهاية كل اللقاءات أدوات بسيطة ملصقات شعور بطاقات أحببت لم يعجبني جمل أو صور تقييم', type:'topic' },

    /* ── Group Interaction ── */
    { id:'group-interact', route:'#/group-interaction', section:'تفاعل المجموعة', title:'إدارة تفاعل المجموعة ودعم الأطفال غير المتفاعلين بشكل صحي', content:'إدارة تفاعل المجموعة ودعم الأطفال غير المتفاعلين بشكل صحي تغيرات تفاعلية سلوكية وعاطفية سريعة من يهيمن أو ينسحب من أعضاء المجموعة', type:'section' },
    { id:'gi-actions', route:'#/group-interaction', section:'تفاعل المجموعة', title:'إجراءات دعم التفاعل', content:'لنوازن المشاركة باستخدام أدوار وقواعد العمل لندعم غير المتفاعلين بأنشطة فردية هادئة لنشجع السلوك الإيجابي بالمديح والتشجيع لنلاحظ المحفزات المقلقة تجنب التغييرات المفاجئة خيارات اسلوب المشاركة هل تفضل أن ترسم أن تحكي أن تشارك لاحقا أدوار تزيد من الثقة والانخراط', type:'topic' },

    /* ── Emotions ── */
    { id:'emotions', route:'#/emotions', section:'المشاعر الأساسية', title:'فهم المشاعر الأساسية', content:'فهم المشاعر الأساسية الأطفال في الأزمات مشاعر قوية يصعب عليهم التعبير عنها مشاعر أساسية تظهر بطرق مختلفة حسب العمر والشخصية', type:'section' },
    { id:'em-fear', route:'#/emotions', section:'المشاعر الأساسية', title:'الخوف', content:'الخوف يظهر كصمت أو تجنب أو تعلق لشعور الطفل بالتهديد', type:'emotion' },
    { id:'em-sadness', route:'#/emotions', section:'المشاعر الأساسية', title:'الحزن', content:'الحزن يظهر كبكاء أو انسحاب أو خمول أو حتى سلوك عنيف عن حالة الفقدان', type:'emotion' },
    { id:'em-anger', route:'#/emotions', section:'المشاعر الأساسية', title:'الغضب', content:'الغضب يظهر كعصبية أو صراخ أو عدوان وينجم عن الشعور بالظلم او قلة التقدير وفقدان الشعور بالسيطرة على مهام الحياة اليومية', type:'emotion' },
    { id:'em-joy', route:'#/emotions', section:'المشاعر الأساسية', title:'الفرح', content:'الفرح قد يبدو مفاجئاً لكنه مؤشر على المرونة وقدرة الطفل على التعامل مع رغابته وتطلعه للمستقبل', type:'emotion' },
    { id:'em-closing', route:'#/emotions', section:'المشاعر الأساسية', title:'دعم الأطفال في فهم مشاعرهم', content:'لنساعد الأطفال على فهم مشاعرهم وتقبلها وتعلم كيفية التعامل معها مما سيدعم مهاراتهم في المواجهة وتعافيهم', type:'topic' },

    /* ── PFA Approach ── */
    { id:'pfa', route:'#/pfa-approach', section:'نهج PFA', title:'إرشادات التيسير باستخدام نهج PFA الاسعاف النفسي الأولي', content:'إرشادات التيسير باستخدام نهج PFA الاسعاف النفسي الأولي Psychological First Aid ثلاث مراحل لننظر لنستمع لنربط', type:'section' },
    { id:'pfa-look', route:'#/pfa-approach', section:'نهج PFA', title:'أولاً: لننظر', content:'لننظر لنراقب السلوك والعلاقات بين الأطفال سلوك الانسحاب أو العدوان أو الخوف احتياجات صحية احتياجات تطرأ خلال العمل PFA', type:'pfa-stage' },
    { id:'pfa-listen', route:'#/pfa-approach', section:'نهج PFA', title:'ثانياً: لنستمع', content:'لنستمع الاهتمام الكامل الاستماع النشط تواصل بصري إيماءات تأكيد مساندة صعوبة الحديث وسائل متنوعة للتعبير تقبل المشاعر بلا حكم PFA', type:'pfa-stage' },
    { id:'pfa-link', route:'#/pfa-approach', section:'نهج PFA', title:'ثالثاً: لنربط', content:'لنربط الأطفال بأنشطة ممتعة وملهمة تعلم مهارات جديدة الدعم الجماعي إحالة خدمات نفسية مختصة الإجراءات المعتمدة مقدمو الرعاية PFA', type:'pfa-stage' },

    /* ── Difficult Behaviors ── */
    { id:'behaviors', route:'#/difficult-behaviors', section:'السلوكيات الصعبة', title:'إدارة السلوكيات الصعبة', content:'إدارة السلوكيات الصعبة', type:'section' },
    { id:'db-strategies', route:'#/difficult-behaviors', section:'السلوكيات الصعبة', title:'استراتيجيات التعامل مع السلوكيات الصعبة', content:'لنبقَ هادئين السلوك العدواني رفض التواصل مؤشر هادئ بطاقة ملونة إشارة باليد دمية لنتعامل مع السلوك لا مع الطفل رمي الأشياء دحرجتها تعزيز السلوك الإيجابي إهمال السلبي لنحول انتباه الطفل لنشاط إيجابي لنتحدث على انفراد الخصوصية هل أنت غاضب طبيعي أن تشعر بذلك لنفكر كيف نتصرف لا للعقاب الجسدي', type:'behavior' },

    /* ── Sessions Overview ── */
    { id:'sessions', route:'#/sessions', section:'اللقاءات', title:'اللقاءات الستة', content:'ستة لقاءات تفاعلية مصممة للعمل مع مجموعات الأطفال تغطي المشاعر والتعبير عنها ونقاط القوة وحل المشكلات وشبكات الدعم', type:'section' },

    /* ══ Session 1 ══ */
    { id:'s1', route:'#/sessions/1', section:'اللقاء الأول', title:'اللقاء الأول', content:'اللقاء الأول ساعتان كل الأعمار أثر الحركة والموسيقى على المشاعر التعبير عن المشاعر بشكل آمن أهمية التعبير عن المشاعر ومشاركتها', type:'session' },
    { id:'s1-a1', route:'#/sessions/1', section:'اللقاء الأول', title:'نشاط التعارف وبناء قواعد العمل كفريق', content:'التعارف وبناء قواعد العمل كفريق كرة دمية بالون لوح قلاب أقلام ملونة الوقوف على شكل دائرة تمرير الكرة التعريف بالنفس ما اسمك ما تحب قواعد العمل التصرفات المسموحة التصرفات غير المسموحة فريق', type:'activity' },
    { id:'s1-a2', route:'#/sessions/1', section:'اللقاء الأول', title:'نشاط التعبير عن المشاعر باستخدام الموسيقى', content:'التعبير عن المشاعر باستخدام الموسيقى موسيقى دبكة فلسطينية موسيقى دحية رقص حركة تصفيق المشاعر طبيعية ومهمة الهاتف الخلوي فرح ضحك تعب', type:'activity' },
    { id:'s1-a3', route:'#/sessions/1', section:'اللقاء الأول', title:'نشاط ورقة نقاط القوة', content:'ورقة نقاط القوة ورق A4 أقلام وألوان طي الورق إلى ثمانية أقسام كتابة كلمة قوة رسمة رمز صفات نقاط القوة أنا قوي أنا كريم أنا متعاون أنا ودود جمع الأوراق للجلسة التالية', type:'activity' },
    { id:'s1-close', route:'#/sessions/1', section:'اللقاء الأول', title:'إغلاق اللقاء الأول', content:'كلنا من وقت لوقت نمر بمشاعر مختلفة مرات بنفرح مرات بنزعل مرات نخاف أو نغضب المشاعر طبيعية ومهمة الحركة والموسيقى مشاركة مع بعض', type:'topic' },

    /* ══ Session 2 ══ */
    { id:'s2', route:'#/sessions/2', section:'اللقاء الثاني', title:'اللقاء الثاني', content:'اللقاء الثاني ساعتان كل الأعمار المشاعر المختلفة وأنها طبيعية التعبير عن المشاعر بشكل آمن الراحة والأمان', type:'session' },
    { id:'s2-a1', route:'#/sessions/2', section:'اللقاء الثاني', title:'نشاط لنصفق تحية الفريق', content:'لنصفق تحية الفريق كرة دمية بالون الوقوف على شكل دائرة تمرير الكرة كيف تشعر اليوم التصفيق بإيقاع منتظم تك تك الحماس والضحك', type:'activity' },
    { id:'s2-a2', route:'#/sessions/2', section:'اللقاء الثاني', title:'نشاط سأصنع طريقي', content:'سأصنع طريقي رسم جماعي تعبير عن المشاعر بالرسم رول ورق طويل ورق تغليف فليب شارت ألوان خشبية شمعية فلوماستر لاصق موسيقى هادئة طريق طويل أشياء يحبونها مشاهد مشاعر أمل قوة شمس قلب شجرة', type:'activity' },
    { id:'s2-a3', route:'#/sessions/2', section:'اللقاء الثاني', title:'نشاط ورقة نقاط القوة (اللقاء الثاني)', content:'ورقة نقاط القوة ورق A4 أقلام وألوان طي الورق إلى ثمانية أقسام كتابة كلمة قوة صفات نقاط القوة', type:'activity' },
    { id:'s2-close', route:'#/sessions/2', section:'اللقاء الثاني', title:'إغلاق اللقاء الثاني', content:'إنهاء وإغلاق اللقاء شكر المجموعة رسم طرق ومخارج مشاركة رأي في نشاط اليوم موعد النشاط اللاحق', type:'topic' },

    /* ══ Session 3 ══ */
    { id:'s3', route:'#/sessions/3', section:'اللقاء الثالث', title:'اللقاء الثالث', content:'اللقاء الثالث ساعتان فئتان عمريتان 6-8 سنوات 11-15 سنة أساليب حل المشكلات السلمية التعبير عن المشاعر والاحتياجات حل النزاعات تجنب السلوك العنيف', type:'session' },
    { id:'s3-a1-young', route:'#/sessions/3', section:'اللقاء الثالث', title:'نشاط لن يقع البالون — 6 إلى 8 سنوات', content:'لن يقع البالون بالونات منتفخة بعدد الأطفال موسيقى دائرة الأطفال يهمس كل منكم بشيء خاص للبالون رفع البالون للأعلى إبقاء البالون في الهواء من يقع بالونه يجلس على الكرسي', type:'activity' },
    { id:'s3-a1-teen', route:'#/sessions/3', section:'اللقاء الثالث', title:'نشاط سباق وانبساط — 11 إلى 15 سنة', content:'سباق وانبساط أقماع وأطواق السباق رمي الطوق فريقان احتساب النقاط روح الفريق الجهد', type:'activity' },
    { id:'s3-a2-young', route:'#/sessions/3', section:'اللقاء الثالث', title:'نشاط هناك حل سلمي دائما — 6 إلى 8 سنوات', content:'هناك حل سلمي دائما قصة طفلين مجد وسعيد فقدان القلم استعار قلم ورقة حمراء وخضراء صح وخطأ المسامحة الاعتذار التعاون طلب مساعدة من المعلمة ملتينة مكافأة', type:'activity' },
    { id:'s3-a2-teen', route:'#/sessions/3', section:'اللقاء الثالث', title:'نشاط هناك حل سلمي دائما — 11 إلى 15 سنة', content:'استراتيجيات حل النزاع العدوانية فرض السيطرة التخويف الصراخ العراك الإهانة التسوية الاستسلام التجنب التأجيل طلب مساندة التعاون الاستماع إيجاد حل مشترك كرت مكتبي حبل مشابك غسيل إيجابيات وسلبيات', type:'activity' },
    { id:'s3-a3', route:'#/sessions/3', section:'اللقاء الثالث', title:'نشاط ورقة نقاط القوة (اللقاء الثالث)', content:'ورقة نقاط القوة ورق A4 أقلام وألوان طي الورق إلى ثمانية أقسام كتابة كلمة قوة رسمة رمز صفات', type:'activity' },
    { id:'s3-close', route:'#/sessions/3', section:'اللقاء الثالث', title:'إغلاق اللقاء الثالث', content:'إنهاء وإغلاق اللقاء الخلافات طبيعية الطريقة التي نختارها لحلها تبين قوتنا ومهاراتنا التدخلات السلمية عند الغضب من شخص ما', type:'topic' },

    /* ══ Session 4 ══ */
    { id:'s4', route:'#/sessions/4', section:'اللقاء الرابع', title:'اللقاء الرابع', content:'اللقاء الرابع ساعتان كل الأعمار التفريق بين المشاعر الإيجابية والسلبية فهم المشاعر بشكل أعمق', type:'session' },
    { id:'s4-a1', route:'#/sessions/4', section:'اللقاء الرابع', title:'نشاط التعارف وبناء قواعد التفاعل في المجموعة', content:'التعارف وبناء قواعد التفاعل في المجموعة دائرة كرة ما تحب أن تكون في المستقبل تصفيق جماعي قواعد عمل مشتركة لوح قلاب اللقاء الرابع ملخص اللقاء السابق', type:'activity' },
    { id:'s4-a2', route:'#/sessions/4', section:'اللقاء الرابع', title:'نشاط التعبير بالموسيقى والغناء والحركة', content:'التعبير بالموسيقى بالغناء والحركة تصفيق مشي غناء أغنية مشاعر نفس عميق أنا أشعر تجهيز مساحة الحركة سلامة الأرضية', type:'activity' },
    { id:'s4-a3', route:'#/sessions/4', section:'اللقاء الرابع', title:'نشاط التعبير بتشكيل معجون ملون', content:'التعبير بتشكيل معجون ملون معجون ورقة بيضاء تشكيل شعور الفرح والغضب والحزن وجه فرحان غضبان حزين مجموعات صغيرة عرض العمل القفز في مكانهم', type:'activity' },
    { id:'s4-key', route:'#/sessions/4', section:'اللقاء الرابع', title:'مفتاحي السري — النغم والتشكيل', content:'مفتاحي السري مفتاح النغم والتعبير بالتشكيل عندما أشعر بضيق سأدندن لحنا أحبه أتحرك مع إيقاع قلبي لأستعيد توازني أعجن المعجون وأشكل أشكال', type:'topic' },

    /* ══ Session 5 ══ */
    { id:'s5', route:'#/sessions/5', section:'اللقاء الخامس', title:'اللقاء الخامس', content:'اللقاء الخامس ساعتان كل الأعمار فهم الذات واحتياجاتها شعور بالأمان والانتماء', type:'session' },
    { id:'s5-a1', route:'#/sessions/5', section:'اللقاء الخامس', title:'نشاط تنشيط الجسم والحركة الحرة', content:'تنشيط الجسم والحركة الحرة مشي سريع بطيء المشي روبوت رجل آلي المشي مثل العصفور كلمة تمثال ضبط النفس التوقف الفوري مشاركون خجولون', type:'activity' },
    { id:'s5-a2', route:'#/sessions/5', section:'اللقاء الخامس', title:'نشاط تمثيل المشاعر بالجسد', content:'تمثيل المشاعر بالجسد وجه سعيد حزين غاضب غضبان قرفان خائف تعابير الوجه ضعيات الجسد تخمين الشعور المشاعر طبيعية ومقبولة خجل', type:'activity' },
    { id:'s5-a3', route:'#/sessions/5', section:'اللقاء الخامس', title:'نشاط القصة الحركية', content:'القصة الحركية قصة مشوقة من عشرة أسطر تسلق هروب اكتشاف تمثيل أحداث القصة أربع مجموعات نهاية سعيدة نفض التعب والتوتر سرد', type:'activity' },
    { id:'s5-key', route:'#/sessions/5', section:'اللقاء الخامس', title:'مفتاحي السري — الثبات والخيال', content:'مفتاحي السري مفتاح الثبات إذا زادت طاقتي عن حدي سأتوقف كتمثال لثوان وآخذ نفسا عميقا لأهدأ شرب ماء مفتاح الخيال خيالي مكاني الآمن بطل قوي يطرد المشاعر المزعجة بعيدا', type:'topic' },

    /* ══ Session 6 ══ */
    { id:'s6', route:'#/sessions/6', section:'اللقاء السادس', title:'اللقاء السادس', content:'اللقاء السادس والأخير ساعتان كل الأعمار معرفة المصادر الداعمة تعزيز الانتماء الروابط مع المحيط مفاتيح اللقاءات السابقة', type:'session' },
    { id:'s6-a1', route:'#/sessions/6', section:'اللقاء السادس', title:'نشاط دائرة الطاقة والضحك', content:'دائرة الطاقة والضحك ضحكة خفيفة تنتقل في الدائرة زيادة صوت الضحك بهجة جماعية وضع اليد على القلب طاقة الفرح اليوم سنضحك كثيرا', type:'activity' },
    { id:'s6-a2', route:'#/sessions/6', section:'اللقاء السادس', title:'نشاط لعبة نعم و...', content:'لعبة نعم و بناء قصة جماعية تركيب جمل قانون يمنع الرفض كلمة لا الإضافة والتعاون أفكار بعضنا جمال النتائج', type:'activity' },
    { id:'s6-a3', route:'#/sessions/6', section:'اللقاء السادس', title:'نشاط لعبة الظل وتكوين الأشكال', content:'لعبة الظل وتكوين الأشكال ثنائيات المحرك والظل تقليد الحركة شكل ثابت مجموعات تناغم حركي تصفيق تعاون', type:'activity' },
    { id:'s6-a4', route:'#/sessions/6', section:'اللقاء السادس', title:'نشاط الختام الجماعي', content:'الختام الجماعي حركة ختامية وهتاف موسيقى حماسية وداع خاص تلخيص ما تعلمناه رسالة ختامية إنجاز', type:'activity' },
    { id:'s6-key', route:'#/sessions/6', section:'اللقاء السادس', title:'مفتاحي السري — الصداقة والبهجة', content:'مفتاح الصداقة لست وحدي دائرة أمان أصدقاء عائلة مشاركة المشاعر مفتاح البهجة الضحك قوتي أجمل لحظة ضحكناها معا الأمل', type:'topic' },
    { id:'s6-msg', route:'#/sessions/6', section:'اللقاء السادس', title:'رسالة للأطفال — المفاتيح الأربعة', content:'رسالة للأطفال جسمي يتكلم تحرك اقفز ارقص لتفرغ الطاقة إذا شعرت بضيق نفسي صديقي خذ نفسا عميقا كأنك تشم وردة وأخرجه كأنك تطفئ شمعة خيالي آماني أغمض عينيك وتخيل مكانا تحبه أصدقائي وأهلي بهجتي وسندي', type:'topic' },

    /* ── Conclusion ── */
    { id:'conclusion', route:'#/conclusion', section:'الخاتمة', title:'الخاتمة', content:'العمل مع الأطفال في سياقات الأزمات ليس مهمة سهلة لكنه من أكثر الأدوار إنسانية وتأثيراً بيئة آمنة وداعمة مبادئ الإسعاف النفسي الأولي ميسّرون في ظروف حساسة الاستماع الإصغاء الطمأنة وجودكم الآمن الداعم يصنع الفرق', type:'section' },
  ];

  /* ── Recent searches ─────────────────────────── */
  var RECENT_KEY = 'facilitators_search_recent';
  function getRecent() {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch(e) { return []; }
  }
  function addRecent(q) {
    if (!q || q.length < 2) return;
    var list = getRecent().filter(function(x){ return x !== q; });
    list.unshift(q);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 5))); } catch(e) {}
  }
  function removeRecent(q) {
    var list = getRecent().filter(function(x){ return x !== q; });
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(list)); } catch(e) {}
  }

  /* ── Run search ──────────────────────────────── */
  function search(query) {
    if (!query || !query.trim()) return [];
    var scored = INDEX
      .map(function(item) { return { item: item, score: score(item, query) }; })
      .filter(function(r) { return r.score > 0; })
      .sort(function(a, b) { return b.score - a.score; });
    return scored.slice(0, 14).map(function(r) { return r.item; });
  }

  /* ══════════════════════════════════════════════
     UI
     ══════════════════════════════════════════════ */
  var modal, input, body, currentResults, focusedIdx, debounceTimer;
  currentResults = [];
  focusedIdx = -1;

  var SUGGESTION_META = [
    { q: 'غضب',         color: '#ef4444', bg: 'rgba(239,68,68,.1)',   svg: '<path d="M12 2c0 0-5 5-5 10a5 5 0 0010 0c0-5-5-10-5-10zm0 7c0 0-2 1.5-2 3.5a2 2 0 004 0C14 10.5 12 9 12 9z" fill="currentColor"/>' },
    { q: 'بالون',        color: '#22c55e', bg: 'rgba(34,197,94,.1)',   svg: '<circle cx="12" cy="10" r="7" stroke="currentColor" stroke-width="2" fill="none"/><path d="M12 17v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' },
    { q: 'PFA',         color: '#ec4899', bg: 'rgba(236,72,153,.1)',  svg: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>' },
    { q: 'المشاعر',     color: '#f97316', bg: 'rgba(249,115,22,.1)',  svg: '<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor"/>' },
    { q: 'نقاط القوة',  color: '#eab308', bg: 'rgba(234,179,8,.1)',   svg: '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77 5.82 21l1.18-6.88L2 9.27l7-.01L12 2z" fill="currentColor"/>' },
    { q: 'اللقاء السادس', color: '#06b6d4', bg: 'rgba(6,182,212,.1)', svg: '<circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 7v5l3.5 3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' },
    { q: 'الخوف',       color: '#8b5cf6', bg: 'rgba(139,92,246,.1)',  svg: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2" fill="none"/>' },
    { q: 'الصمود',      color: '#0ea5e9', bg: 'rgba(14,165,233,.1)',  svg: '<path d="M8 3L2 21h20L14 9l-3 4.5L8 3z" stroke="currentColor" stroke-width="2" fill="none" stroke-linejoin="round"/>' },
  ];

  /* ── Build modal DOM ─────────────────────────── */
  function buildModal() {
    var el = document.createElement('div');
    el.id = 'search-modal';
    el.className = 'search-modal';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', 'بحث في الدليل');
    el.innerHTML =
      '<div class="search-box">' +
        '<div class="search-input-row">' +
          '<svg class="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none">' +
            '<circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2.2"/>' +
            '<line x1="16.5" y1="16.5" x2="21" y2="21" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>' +
          '</svg>' +
          '<input class="search-input" id="search-input" type="search" dir="rtl" autocomplete="off" spellcheck="false" ' +
            'placeholder="ابحث في الدليل..." />' +
          '<button class="search-esc-badge" id="search-close-kbd" aria-label="إغلاق">Esc</button>' +
        '</div>' +
        '<div class="search-body" id="search-body"></div>' +
        '<div class="search-footer">' +
          '<span class="sf-hint"><span class="sf-key">↑</span><span class="sf-key">↓</span><span class="sf-label"> تنقّل</span></span>' +
          '<span class="sf-hint"><span class="sf-key">↵</span><span class="sf-label"> انتقل</span></span>' +
          '<span class="sf-hint"><span class="sf-key">Esc</span><span class="sf-label"> إغلاق</span></span>' +
        '</div>' +
      '</div>';
    document.body.appendChild(el);
    return el;
  }

  /* ── Render suggestions/recent state ────────── */
  function renderDefault() {
    var recent = getRecent();
    var html = '';
    if (recent.length) {
      html += '<div class="sd-hdr">' +
        '<svg width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/><path d="M12 7v5l3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' +
        ' بحث سابق</div>';
      recent.forEach(function(r) {
        html += '<div class="sd-row" tabindex="0" data-q="' + esc(r) + '" role="option">' +
          '<div class="sd-row-icon">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/><path d="M12 7v5l3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' +
          '</div>' +
          '<span class="sd-row-text">' + esc(r) + '</span>' +
          '<button class="sd-row-del" data-del="' + esc(r) + '" aria-label="حذف" tabindex="-1">' +
            '<svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>' +
          '</button>' +
        '</div>';
      });
      html += '<div class="sd-divider"></div>';
    }
    html += '<div class="sd-hdr">' +
      '<svg width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/><line x1="16.5" y1="16.5" x2="21" y2="21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' +
      ' مقترحات</div>';
    html += '<div class="sd-sug-grid">';
    SUGGESTION_META.forEach(function(s) {
      html += '<button class="sd-sug" data-q="' + esc(s.q) + '" style="--sug-c:' + s.color + '">' +
        '<div class="sd-sug-icon" style="background:' + s.bg + ';color:' + s.color + '">' +
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none">' + s.svg + '</svg>' +
        '</div>' +
        esc(s.q) +
      '</button>';
    });
    html += '</div>';
    body.innerHTML = html;

    body.querySelectorAll('.sd-row').forEach(function(row) {
      row.addEventListener('click', function(e) {
        if (e.target.closest('.sd-row-del')) return;
        input.value = row.dataset.q;
        input.dispatchEvent(new Event('input'));
        input.focus();
      });
      row.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          input.value = row.dataset.q;
          input.dispatchEvent(new Event('input'));
          input.focus();
        }
      });
    });

    body.querySelectorAll('.sd-row-del').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        removeRecent(btn.dataset.del);
        renderDefault();
      });
    });

    body.querySelectorAll('.sd-sug').forEach(function(btn) {
      btn.addEventListener('click', function() {
        input.value = btn.dataset.q;
        input.dispatchEvent(new Event('input'));
        input.focus();
      });
    });
  }

  /* ── Render results ──────────────────────────── */
  function renderResults(results, query) {
    currentResults = results;
    focusedIdx = -1;
    if (!results.length) {
      body.innerHTML =
        '<div class="sr-empty">' +
          '<div class="sr-empty-icon">' +
            '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/><line x1="16.5" y1="16.5" x2="21" y2="21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' +
          '</div>' +
          '<p class="sr-empty-title">لا نتائج لـ <strong>"' + esc(query) + '"</strong></p>' +
          '<p class="sr-empty-hint">جرّب: غضب · PFA · شجرة الحياة · الصمود</p>' +
        '</div>';
      return;
    }
    var html =
      '<p class="sr-count">' + results.length + ' نتيجة</p>' +
      '<ul class="search-results-list" role="listbox">';
    results.forEach(function(item, i) {
      var m = typeMeta(item.type);
      var snip = snippet(item.content, query);
      html +=
        '<li>' +
        '<button class="search-result-item" role="option" data-idx="' + i + '">' +
          '<div class="sr-icon color-' + m.color + '">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none">' + m.icon + '</svg>' +
          '</div>' +
          '<div class="sr-body">' +
            '<div class="sr-meta">' +
              '<span class="sr-section">' + esc(item.section) + '</span>' +
              '<span class="sr-badge color-' + m.color + '">' + esc(m.label) + '</span>' +
            '</div>' +
            '<div class="sr-title">' + highlight(item.title, query) + '</div>' +
            '<div class="sr-snip">' + highlight(snip, query) + '</div>' +
          '</div>' +
          '<svg class="sr-arrow" width="14" height="14" viewBox="0 0 16 16" fill="none">' +
            '<path d="M10 3L5 8l5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>' +
          '</svg>' +
        '</button>' +
        '</li>';
    });
    html += '</ul>';
    body.innerHTML = html;
    body.querySelectorAll('.search-result-item').forEach(function(btn) {
      btn.addEventListener('click', function() { navigate(results[+btn.dataset.idx]); });
    });
  }

  /* ── Keyboard focus management ───────────────── */
  function setFocus(idx) {
    var items = body.querySelectorAll('.search-result-item');
    items.forEach(function(el) { el.classList.remove('focused'); });
    if (idx >= 0 && idx < items.length) {
      focusedIdx = idx;
      items[idx].classList.add('focused');
      items[idx].scrollIntoView({ block: 'nearest' });
    } else {
      focusedIdx = -1;
    }
  }

  /* ── Navigate to result ──────────────────────── */
  function navigate(item) {
    addRecent(input.value.trim());
    close();
    var currentHash = window.location.hash || '#/';
    var targetHash  = item.route || '#/';

    function scrollAndFlash(selector) {
      var navH = (document.querySelector('.navbar') || {}).offsetHeight || 0;
      var target = selector ? document.querySelector(selector) : null;
      if (target) {
        var top = target.getBoundingClientRect().top + window.pageYOffset - navH - 16;
        window.scrollTo({ top: top, behavior: 'smooth' });
        setTimeout(function() {
          target.classList.add('search-flash');
          setTimeout(function() { target.classList.remove('search-flash'); }, 2000);
        }, 400);
      }
    }

    if (currentHash === targetHash) {
      scrollAndFlash(item.scrollTo);
    } else {
      window.location.hash = targetHash;
      setTimeout(function() { scrollAndFlash(item.scrollTo); }, 350);
    }
  }

  /* ── Open / Close ────────────────────────────── */
  function open() {
    if (!modal) init();
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    setTimeout(function() { input.focus(); }, 60);
    renderDefault();
  }

  function close() {
    if (!modal) return;
    modal.classList.remove('open');
    document.body.style.overflow = '';
    input.value = '';
    focusedIdx = -1;
  }

  /* ── Wire up events ──────────────────────────── */
  function init() {
    modal = buildModal();
    input = document.getElementById('search-input');
    body  = document.getElementById('search-body');

    /* backdrop / Esc close */
    modal.addEventListener('click', function(e) { if (e.target === modal) close(); });
    document.getElementById('search-close-kbd').addEventListener('click', close);

    /* typing */
    input.addEventListener('input', function() {
      clearTimeout(debounceTimer);
      var q = input.value.trim();
      if (!q) { renderDefault(); return; }
      debounceTimer = setTimeout(function() {
        renderResults(search(q), q);
      }, 200);
    });

    /* keyboard navigation */
    input.addEventListener('keydown', function(e) {
      var items = body.querySelectorAll('.search-result-item');
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocus(Math.min(focusedIdx + 1, items.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocus(Math.max(focusedIdx - 1, 0));
      } else if (e.key === 'Enter') {
        if (focusedIdx >= 0 && currentResults[focusedIdx]) {
          navigate(currentResults[focusedIdx]);
        }
      } else if (e.key === 'Escape') {
        close();
      }
    });
  }

  /* ── Global keyboard shortcut Ctrl+K / Cmd+K ── */
  document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      if (!modal || !modal.classList.contains('open')) open();
      else close();
    }
    if (e.key === 'Escape' && modal && modal.classList.contains('open')) close();
  });

  /* ── Wire up all search trigger buttons ─────── */
  function wireButtons() {
    document.querySelectorAll('.navbar-search').forEach(function(btn) {
      btn.addEventListener('click', function(e) { e.stopPropagation(); open(); });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireButtons);
  } else {
    wireButtons();
  }

  /* expose for potential external use */
  window.SiteSearch = { open: open, close: close };

})();
