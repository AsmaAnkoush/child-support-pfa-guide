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
    { id:'home', route:'#/', section:'الرئيسية', title:'دليل الميسّرات والميسّرين', content:'إجراءات توجيهية في العمل مع مجموعات الأطفال باستخدام نهج الإسعاف النفسي الأولي PFA وقت الطوارئ والأزمات مدرسة البلد جامعة بيرزيت 2026', type:'page' },
    { id:'about', route:'#/about', section:'عن الدليل', title:'عن الدليل', content:'تم إعداد هذا الدليل لميسري وميسرات الدعم النفسي الاجتماعي ضمن مشروع مدرسة البلد بهدف تمكينهم في العمل مع الأطفال في الفئة العمرية من 6 إلى 15 عاماً في سياقات الطوارئ والأزمات اليونيسف', type:'section' },
    { id:'stats-sessions', route:'#/', section:'الرئيسية', title:'اللقاءات التفاعلية الثلاث', content:'ثلاث لقاءات تفاعلية مصممة للعمل مع الأطفال في سياقات الأزمات والطوارئ', type:'topic' },
    { id:'stats-facilitators', route:'#/', section:'الرئيسية', title:'الميسّرون والميسّرات', content:'أكثر من 500 ميسّر وميسّرة تلقوا تدريباً على استخدام هذا الدليل', type:'topic' },
    { id:'stats-activities', route:'#/', section:'الرئيسية', title:'الأنشطة التفاعلية', content:'أكثر من 20 نشاطاً تفاعلياً متنوعاً مناسباً للأطفال في مختلف الأعمار', type:'activity' },
    { id:'stats-age', route:'#/', section:'الرئيسية', title:'الفئة العمرية المستهدفة', content:'الأطفال في الفئة العمرية من 6 إلى 15 سنة', type:'topic' },

    /* ── Principles ── */
    { id:'principles', route:'#/principles', section:'المبادئ', title:'المبادئ العامة', content:'مبادئ العمل مع الأطفال في سياقات الطوارئ والأزمات الكرامة السلامة المشاركة عدم التمييز الاستجابة المجتمعية الصمود', type:'section' },
    { id:'p-safety', route:'#/principles', section:'المبادئ', title:'مبدأ السلامة والأمان', content:'ضمان بيئة آمنة جسدياً وعاطفياً للأطفال خلال جميع الأنشطة والجلسات تجنّب إيذاء الأطفال', type:'principle' },
    { id:'p-dignity', route:'#/principles', section:'المبادئ', title:'مبدأ الكرامة والاحترام', content:'التعامل مع الأطفال باحترام كامل وتقدير لكرامتهم الشخصية والهوية الثقافية', type:'principle' },
    { id:'p-participation', route:'#/principles', section:'المبادئ', title:'مبدأ المشاركة الفعّالة', content:'تشجيع الأطفال على المشاركة الإيجابية والتعبير عن أفكارهم ومشاعرهم بحرية', type:'principle' },
    { id:'p-nondiscrim', route:'#/principles', section:'المبادئ', title:'مبدأ عدم التمييز', content:'ضمان المساواة في التعامل مع جميع الأطفال بغض النظر عن الجنس والعمر والخلفية والقدرات', type:'principle' },
    { id:'p-community', route:'#/principles', section:'المبادئ', title:'الاستجابة المجتمعية', content:'دمج الأنشطة ضمن إطار مجتمعي داعم يعزز الانتماء والأمان الاجتماعي للأطفال', type:'principle' },
    { id:'p-resilience', route:'#/principles', section:'المبادئ', title:'تعزيز الصمود والقوة', content:'بناء الصمود النفسي ونقاط القوة الداخلية للأطفال لمواجهة التحديات', type:'principle' },

    /* ── Group Management ── */
    { id:'group-mgmt', route:'#/group-management', section:'إدارة المجموعة', title:'إدارة المجموعة', content:'أساليب وإجراءات إدارة مجموعات الأطفال ترتيب الجلوس قواعد المجموعة التفاعل والمشاركة بناء الثقة الديناميكيات', type:'section' },
    { id:'gm-age-groups', route:'#/group-management', section:'إدارة المجموعة', title:'الفئات العمرية', content:'التعامل مع الأطفال في الفئة 6 إلى 9 سنوات والفئة 10 إلى 15 سنة مراعاة الفروق النمائية والفردية', type:'topic' },
    { id:'gm-rules', route:'#/group-management', section:'إدارة المجموعة', title:'قواعد المجموعة', content:'وضع قواعد واضحة وإشراك الأطفال في صياغتها لضمان بيئة آمنة منظمة ومحترمة', type:'topic' },
    { id:'gm-inclusion', route:'#/group-management', section:'إدارة المجموعة', title:'الشمول والدمج', content:'ممارسات شمول الأطفال ذوي الاحتياجات الخاصة والإعاقات المختلفة ضمن أنشطة المجموعة', type:'topic' },
    { id:'gm-seating', route:'#/group-management', section:'إدارة المجموعة', title:'ترتيب الجلوس', content:'أهمية ترتيب الجلوس الدائري أو شبه الدائري لتعزيز المساواة والتواصل بين الأطفال', type:'topic' },
    { id:'gm-size', route:'#/group-management', section:'إدارة المجموعة', title:'حجم المجموعة المناسب', content:'العدد المثالي للأطفال في المجموعة الواحدة بين 8 و 15 طفلاً لضمان التفاعل الفعّال', type:'topic' },

    /* ── Emotions ── */
    { id:'emotions', route:'#/emotions', section:'المشاعر', title:'فهم مشاعر الأطفال', content:'التعرف على المشاعر الأساسية وكيفية التعبير عنها والتعامل معها في سياق الأزمات الصدمة والفقدان', type:'section' },
    { id:'em-fear', route:'#/emotions', section:'المشاعر', title:'الخوف والقلق', content:'التعرف على مشاعر الخوف والقلق لدى الأطفال وأساليب التعامل معها وتخفيف حدتها تقنيات الاسترخاء', type:'emotion' },
    { id:'em-anger', route:'#/emotions', section:'المشاعر', title:'الغضب', content:'فهم مشاعر الغضب لدى الأطفال التعبير الصحي عن الغضب إدارة الغضب كيف يساعد الميسّر الطفل الغاضب', type:'emotion' },
    { id:'em-sadness', route:'#/emotions', section:'المشاعر', title:'الحزن والفقدان', content:'مساعدة الأطفال على فهم مشاعر الحزن والفقدان والتعبير عنها بشكل صحي الحداد والأسى', type:'emotion' },
    { id:'em-joy', route:'#/emotions', section:'المشاعر', title:'الفرح والسعادة', content:'تعزيز مشاعر الفرح والإيجابية لدى الأطفال في سياقات الطوارئ من خلال الأنشطة واللعب الإيجابي', type:'emotion' },
    { id:'em-shame', route:'#/emotions', section:'المشاعر', title:'الخجل والذنب', content:'التعامل مع مشاعر الخجل والذنب لدى الأطفال تصحيح المفاهيم الخاطئة تعزيز مفهوم الذات', type:'emotion' },
    { id:'em-love', route:'#/emotions', section:'المشاعر', title:'الحب والانتماء', content:'تعزيز مشاعر الحب والانتماء والأمان لدى الأطفال ضمن إطار المجموعة والأسرة', type:'emotion' },
    { id:'em-hope', route:'#/emotions', section:'المشاعر', title:'الأمل والتطلع للمستقبل', content:'بناء مشاعر الأمل والتفاؤل لدى الأطفال وتصوّر مستقبل أفضل رغم الأزمات', type:'emotion' },

    /* ── PFA Approach ── */
    { id:'pfa', route:'#/pfa-approach', section:'نهج PFA', title:'الإسعاف النفسي الأولي PFA', content:'نهج الإسعاف النفسي الأولي أسس التدخل النفسي في حالات الطوارئ الاستجابة للصدمة دعم الصمود النفسي الاجتماعي', type:'section' },
    { id:'pfa-look', route:'#/pfa-approach', section:'نهج PFA', title:'انظر — Look', content:'المرحلة الأولى من PFA الملاحظة والتقييم الأولي لاحتياجات الأطفال وتحديد مستوى الضائقة النفسية', type:'pfa-stage' },
    { id:'pfa-listen', route:'#/pfa-approach', section:'نهج PFA', title:'استمع — Listen', content:'المرحلة الثانية من PFA الإنصات الفعّال والحضور الكامل مع الأطفال مساعدتهم على التعبير عن مشاعرهم', type:'pfa-stage' },
    { id:'pfa-link', route:'#/pfa-approach', section:'نهج PFA', title:'اربط — Link', content:'المرحلة الثالثة من PFA ربط الأطفال بمصادر الدعم الموارد المتاحة في المجتمع الأسرة والخدمات', type:'pfa-stage' },
    { id:'pfa-principles', route:'#/pfa-approach', section:'نهج PFA', title:'مبادئ PFA الخمسة', content:'الأمان والهدوء الكفاءة الذاتية الترابط الاجتماعي الأمل المبادئ الخمسة للإسعاف النفسي الأولي', type:'topic' },
    { id:'pfa-who', route:'#/pfa-approach', section:'نهج PFA', title:'من يطبّق PFA؟', content:'الميسّرات والميسّرون المدرّبون على نهج الإسعاف النفسي الأولي المتطوعون العاملون في سياقات الطوارئ', type:'topic' },

    /* ── Sessions ── */
    { id:'sessions', route:'#/sessions', section:'اللقاءات', title:'اللقاءات الثلاثة', content:'ثلاثة لقاءات تفاعلية مصممة للعمل مع مجموعات الأطفال تغطي المشاعر ونقاط القوة وشبكات الدعم', type:'section' },

    /* Session 1 */
    { id:'s1', route:'#/sessions', section:'اللقاء الأول', title:'اللقاء الأول — أنا وعالمي', content:'التعارف وبناء الثقة التعرف على المشاعر الأساسية التعبير عن النفس قواعد المجموعة نشاط الدمية', type:'session' },
    { id:'s1-a1', route:'#/sessions', section:'اللقاء الأول', title:'نشاط التعارف والدمية', content:'نشاط تمهيدي يستخدم دمية أو شخصية مُحبّة لتحفيز الأطفال على التعريف بأنفسهم وبناء الثقة', type:'activity' },
    { id:'s1-a2', route:'#/sessions', section:'اللقاء الأول', title:'نشاط خريطة المشاعر', content:'يتعرف الأطفال على المشاعر الأساسية من خلال بطاقات مصورة ويتعلمون تسميتها والتعبير عنها بأمان', type:'activity' },
    { id:'s1-a3', route:'#/sessions', section:'اللقاء الأول', title:'نشاط جسد المشاعر', content:'يستكشف الأطفال كيف تتجلى المشاعر في الجسم ويتعلمون تحديد الإحساس الجسدي المرتبط بكل مشاعر', type:'activity' },
    { id:'s1-close', route:'#/sessions', section:'اللقاء الأول', title:'إغلاق اللقاء الأول', content:'مشاركة تأملية لما تعلمه الأطفال اليوم وختام اللقاء بطريقة إيجابية وآمنة', type:'topic' },

    /* Session 2 */
    { id:'s2', route:'#/sessions', section:'اللقاء الثاني', title:'اللقاء الثاني — ما يقوّيني', content:'التعرف على نقاط القوة الشخصية ورقة نقاط القوة الموارد الداخلية مفهوم الصمود الشجاعة', type:'session' },
    { id:'s2-a1', route:'#/sessions', section:'اللقاء الثاني', title:'نشاط ورقة نقاط القوة', content:'يكتشف الأطفال نقاط قوتهم ومواردهم الداخلية ويرسمونها أو يكتبونها على ورقة خاصة بهم', type:'activity' },
    { id:'s2-a2', route:'#/sessions', section:'اللقاء الثاني', title:'نشاط استراتيجيات المواجهة', content:'استراتيجيات التأقلم والتعامل مع الضغط والصعوبات اليومية أساليب مواجهة المواقف الصعبة', type:'activity' },
    { id:'s2-a3', route:'#/sessions', section:'اللقاء الثاني', title:'نشاط بطل قصتي', content:'يروي الأطفال قصصاً عن لحظات كانوا فيها أقوياء وشجعاناً لتعزيز الثقة بالنفس', type:'activity' },
    { id:'s2-close', route:'#/sessions', section:'اللقاء الثاني', title:'إغلاق اللقاء الثاني', content:'ختام إيجابي وتوزيع ورقة نقاط القوة على الأطفال لأخذها معهم للبيت', type:'topic' },

    /* Session 3 */
    { id:'s3', route:'#/sessions', section:'اللقاء الثالث', title:'اللقاء الثالث — من يدعمني', content:'شجرة الحياة دوائر الدعم الاجتماعي الأسرة الأصدقاء المجتمع مصادر الدعم شبكة الأمان', type:'session' },
    { id:'s3-tree', route:'#/sessions', section:'اللقاء الثالث', title:'نشاط شجرة الحياة', content:'شجرة الحياة نشاط علاجي يستكشف فيه الأطفال جذورهم تاريخهم قيمهم أحلامهم للمستقبل الجذور الجذع الأغصان الأوراق الثمار', type:'activity' },
    { id:'s3-circles', route:'#/sessions', section:'اللقاء الثالث', title:'نشاط دوائر الدعم', content:'دوائر الدعم الاجتماعي للطفل الأشخاص المقربون الأسرة الأصدقاء المعلمون المجتمع شبكة الأمان', type:'activity' },
    { id:'s3-letter', route:'#/sessions', section:'اللقاء الثالث', title:'رسالة ختامية للطفل', content:'رسالة تشجيعية ختامية للطفل تُذكّره بنقاط قوته ومصادر دعمه وقيمته', type:'activity' },
    { id:'s3-close', route:'#/sessions', section:'اللقاء الثالث', title:'إغلاق اللقاء الثالث والختام', content:'احتفال ختامي بإنجاز الأطفال وتوزيع شهادات أو تذكارات رمزية', type:'topic' },

    /* ── Behaviors ── */
    { id:'behaviors', route:'#/principles', section:'إدارة السلوك', title:'إدارة السلوكيات الصعبة', content:'التعامل مع السلوكيات التحدية لدى الأطفال في المجموعات العدوانية الانسحاب البكاء التشتت العناد', type:'section' },
    { id:'beh-aggression', route:'#/principles', section:'إدارة السلوك', title:'التعامل مع العدوانية', content:'استراتيجيات التعامل مع الطفل العدواني إعادة التوجيه وضع الحدود بهدوء الاستجابة غير العقابية', type:'behavior' },
    { id:'beh-withdrawal', route:'#/principles', section:'إدارة السلوك', title:'التعامل مع الانسحاب والانطواء', content:'مساعدة الأطفال المنسحبين على الانخراط التدريجي في أنشطة المجموعة بطريقة آمنة ومريحة', type:'behavior' },
    { id:'beh-crying', route:'#/principles', section:'إدارة السلوك', title:'التعامل مع البكاء', content:'البكاء استجابة طبيعية كيف يتعامل الميسّر بتعاطف وكفاءة مع الطفل الباكي دون إحراجه', type:'behavior' },
    { id:'beh-distraction', route:'#/principles', section:'إدارة السلوك', title:'التعامل مع التشتت وقلة الانتباه', content:'أساليب استعادة انتباه الأطفال المشتّتين وتعزيز التركيز باستخدام أنشطة حركية وتنشيطية', type:'behavior' },

    /* ── Facilitation Tips ── */
    { id:'pfa-tips', route:'#/pfa-approach', section:'نهج PFA', title:'إرشادات التيسير باستخدام PFA', content:'كيف يطبق الميسّر نهج PFA في الجلسات الجماعية مهارات الاستماع الفعّال التعبير عن التعاطف', type:'topic' },
    { id:'interaction-mgmt', route:'#/group-management', section:'إدارة المجموعة', title:'إدارة التفاعل', content:'إدارة ديناميكيات التفاعل بين الأطفال تشجيع الحوار الإيجابي التعامل مع التنافس والخلافات', type:'topic' },

    /* ── Conclusion ── */
    { id:'conclusion', route:'#/conclusion', section:'الخاتمة', title:'الخاتمة', content:'خلاصة دليل الميسّرات والميسّرين التوصيات النهائية المراجع والمصادر رسالة ختامية للميسّرات والميسّرين', type:'section' },
    { id:'conclusion-refs', route:'#/conclusion', section:'الخاتمة', title:'المراجع والمصادر', content:'قائمة المراجع العلمية والمصادر التي استند إليها الدليل منظمة الصحة العالمية اليونيسف Save the Children', type:'topic' },
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
    { q: 'شجرة الحياة', color: '#22c55e', bg: 'rgba(34,197,94,.1)',   svg: '<path d="M12 2L7 10h3L6 18h5v4h2v-4h5l-4-8h3L12 2z" fill="currentColor"/>' },
    { q: 'PFA',         color: '#ec4899', bg: 'rgba(236,72,153,.1)',  svg: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>' },
    { q: 'المشاعر',     color: '#f97316', bg: 'rgba(249,115,22,.1)',  svg: '<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor"/>' },
    { q: 'نقاط القوة',  color: '#eab308', bg: 'rgba(234,179,8,.1)',   svg: '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77 5.82 21l1.18-6.88L2 9.27l7-.01L12 2z" fill="currentColor"/>' },
    { q: 'دوائر الدعم', color: '#06b6d4', bg: 'rgba(6,182,212,.1)',   svg: '<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/><circle cx="9" cy="7" r="4" stroke="currentColor" stroke-width="2" fill="none"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>' },
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
