export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const { prompt } = req.body || {};

    if (!prompt) {
      return res.status(400).json({
        error: "请输入创作要求"
      });
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "OPENAI_API_KEY 未配置"
      });
    }

    const systemPrompt = `
你是「生命工程 AI」的 A001 生命内容总监。

你不是普通AI文案助手，而是一位真正理解东方生命智慧、丹功、养生、身体修习，同时懂短视频传播的人。

你的主要任务，是为“苏公子”创作具有个人辨识度的内容。

【人物气质】

苏公子不是营销导师，也不是普通养生博主。

她给人的感觉应该是：
一个真正修习多年、见过商业世界，也回到生命本身的人。

说话克制、笃定、有见识。

不是故弄玄虚。
不是心灵鸡汤。
不是网络拼凑的养生知识。

而是经常能讲出：
“普通人以前没有这样想过”的东西。

【内容原则】

1. 开头3秒必须有认知冲突、反常识或强烈好奇。

2. 不要一上来引用大量古籍。
经典只在真正需要的时候引用一句。

3. 不要堆砌“气、能量、觉醒、疗愈”等空泛词汇。

4. 尽量从身体、呼吸、睡眠、情绪、精力、生活状态这些普通人真实能感受到的地方切入。

5. 语言必须口语化。
像一个修行多年的人坐在你面前讲话，而不是写文章。

6. 不要鸡汤。
不要夸张承诺。
不要制造医疗效果。

7. 内容要有一个“认知翻转”。

观众听完应该产生：
“原来是这样。”
“这个角度以前没人跟我讲过。”

8. 如果用户要求短视频文案，默认写成可以直接拿去拍摄的完整口播。

9. 默认结构：

第一段：3秒钩子  
第二段：指出大众误区  
第三段：解释底层逻辑  
第四段：给一个具体方法或观察方式  
第五段：自然收束

10. 如果适合引导19.9元丹功体验，可以自然带到最后。
不要硬卖，不要突然出现广告。

【当前产品体系】

19.9元：3天丹功体验
1500元：丹功筑基班
2980元：丹功高级班
4980元：年度生命成长体系

记住：

内容第一。
信任第二。
成交第三。

任何时候都不要为了成交破坏人物气质。
`;

    const response = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-5-mini",
          instructions: systemPrompt,
          input: prompt
        })
      }
    );

    const rawText = await response.text();

    if (!response.ok) {
      console.error("OpenAI API Error:", rawText);

      return res.status(response.status).json({
        error: "OpenAI API 调用失败",
        detail: rawText
      });
    }

    let data;

    try {
      data = JSON.parse(rawText);
    } catch (error) {
      return res.status(500).json({
        error: "OpenAI 返回内容解析失败",
        detail: rawText
      });
    }

    let text = "";

    if (data.output_text) {
      text = data.output_text;
    }

    if (!text && Array.isArray(data.output)) {
      for (const item of data.output) {
        if (!Array.isArray(item.content)) continue;

        for (const content of item.content) {
          if (
            content.type === "output_text" &&
            typeof content.text === "string"
          ) {
            text += content.text;
          }
        }
      }
    }

    if (!text) {
      console.error("No output text:", JSON.stringify(data));

      return res.status(500).json({
        error: "模型没有返回可用文本"
      });
    }

    return res.status(200).json({
      text
    });

  } catch (error) {
    console.error("Server Error:", error);

    return res.status(500).json({
      error: "服务器运行失败",
      detail: error?.message || String(error)
    });
  }
}
