// 题库数据配置文件
// 
// 数据结构说明：
// - quizBlocks: 大题数组，每个元素代表一个大题
// - title: 大题标题
// - questions: 该大题下的所有问题
// 
// 问题类型说明：
// 1. single: 单选题
//    - question: 题目文本
//    - options: 选项数组
//    - answer: 正确答案的索引（从0开始）
// 
// 2. multi: 多选题
//    - question: 题目文本
//    - options: 选项数组
//    - answer: 正确答案的索引数组
// 
// 3. blanks: 选词填空题
//    - options: 可选词汇数组
//    - items: 填空题目数组，每个元素为 [题目, 答案]
// 
// 4. text: 开放式填空题
//    - question: 题目文本
//    - answer: 参考答案

const quizBlocks = [
  {
    title: 'Meaning Matching (Multiple Choice Possible)',
    questions: [
      { 
        type: 'multi', 
        question: 'animated', 
        options: ['活跃的','动画的','冷静的','悲伤的'], 
        answer: [0,1] // A, B
      },
      { 
        type: 'multi', 
        question: 'scandalous', 
        options: ['秘密的','可耻的','无聊的','令人震惊的'], 
        answer: [1,3] // B, D
      },
      { 
        type: 'multi', 
        question: 'sniff', 
        options: ['用鼻子吸气','大声笑','抱怨地说','快速说话'], 
        answer: [0,2] // A, C
      },
      { 
        type: 'multi', 
        question: 'bemoan', 
        options: ['赞美','抱怨','接受','批评'], 
        answer: [1] // B
      },
      { 
        type: 'multi', 
        question: 'informant', 
        options: ['记者','警察','告密者','听众'], 
        answer: [2] // C
      },
      { 
        type: 'multi', 
        question: 'speculate', 
        options: ['确认','推测','投资','忽略'], 
        answer: [1,2] // B, C
      },
      { 
        type: 'multi', 
        question: 'reciprocate', 
        options: ['重复','回报','拒绝','前后移动'], 
        answer: [1,3] // B, D
      },
      { 
        type: 'multi', 
        question: 'disturbingly', 
        options: ['平静地','令人不安地','有趣地','轻微地'], 
        answer: [1] // B
      },
      { 
        type: 'multi', 
        question: 'effeminate', 
        options: ['女性化的','强壮有力的','中性的','粗鲁的'], 
        answer: [0] // A
      },
      { 
        type: 'multi', 
        question: 'decidedly', 
        options: ['犹豫地','明显地','决定性地','轻微地'], 
        answer: [1,2] // B, C
      },
      { 
        type: 'multi', 
        question: 'etiquette', 
        options: ['法律','礼仪','习惯','规则'], 
        answer: [1] // B
      },
      { 
        type: 'multi', 
        question: 'expletive', 
        options: ['脏话','赞美词','无意义的词','专业术语'], 
        answer: [0,2] // A, C
      },
      { 
        type: 'multi', 
        question: 'masculine', 
        options: ['男性的','中性的','典型的','强壮的'], 
        answer: [0,3] // A,D
      }
    ]
  }, 
  {
    title: 'Cloze (Using Correct Form)',
    questions: [
      {
        type: 'blanks',
        options: ['animated','scandalous','sniff','bemoan','informant','speculate','reciprocate','disturbingly','effeminate','decidedly','etiquette','expletive','masculine'],
        items: [
          ['She always speaks in such an _____ voice that everyone finds her stories exciting.', 'animated'],
          ['The news was so _____ that it shocked the whole community.', 'scandalous'],
          ['He tends to _____ the lack of detail in men\'s gossip.', 'bemoan'],
          ['As an _____, she provided valuable information to the researchers.', 'informant'],
          ['It is polite to _____ when someone shows kindness to you.', 'reciprocate'],
          ['The number of errors in the report was _____ high.', 'disturbingly'],
          ['Using strong _____ is considered rude in formal conversation.', 'expletives']
        ]
      }
    ]
  },
  { 
    title: 'English-Chinese Translation (Do not need to write down. Wait to be called and answer the question.)', 
    questions: [
      { 
        type: 'text', 
        question: 'The animated discussion finally led to a decidedly clear action plan.', 
        answer: '这场热烈的(animated)讨论最终形成了一个相当明确的(decidedly)行动计划。' 
      },
      { 
        type: 'text', 
        question: 'He muttered an angry expletive when he saw the disturbingly low score on his test.', 
        answer: '看到试卷上低得令人不安的(disturbingly)分数时，他低声骂了句脏话(expletive)。' 
      },
      { 
        type: 'text', 
        question: '投资者正在推测市场对这条耸人听闻的新闻会作何反应。', 
        answer: 'Investors are speculating(推测) on how the market will react to this scandalous(耸人听闻的) news.' 
      },
      { 
        type: 'text', 
        question: '在正式的商业礼仪中，表现出男子气概的自信通常受到赞赏，但过于女性化的举止可能会被误解。', 
        answer: 'In formal business etiquette(礼仪), displaying masculine(男子气概的) confidence is often appreciated, but overly effeminate(女性化的) behaviors might be misunderstood.' 
      }
    ] 
  }
];

module.exports = { quizBlocks };