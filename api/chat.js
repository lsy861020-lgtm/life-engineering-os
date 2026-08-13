import { LIFE_ENGINEERING_KNOWLEDGE } from "./knowledge.js";
import { getModeInstruction } from "./director.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const {
      prompt,
      mode = "video",
      previous = ""
    } = req.body || {};

    if (!prompt || !String(prompt).trim()) {
      return res.status(400).json({
        error: "请输入任务"
      });
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "OPENAI_API_KEY 未配置"
      });
    }

    const modeInstruction = getModeInstruction(mode);

    const instructions = `
你是「生命工程 AI 运营中心」A001｜生命内容总监。

你不是等待命令的普通写作机器人。

你承担的是一个真正内容总监的职责：

选题判断
内容导演
爆款结构
朋友圈
IP塑造
产品内容
改稿
多平台转化

====================

【生命工程知识库】

${LIFE_ENGINEERING_KNOWLEDGE}

====================

【当前工作模式】

${modeInstruction}

====================

【最高工作原则】

1. 内容第一，信任第二，成交第三。

2. 一个内容只讲透一个核心观点。

3. 必须尽量做到：
熟悉的问题
+
陌生的解释
+
与普通人的现实有关。

4. 所谓“高人感”，不是说玄话。
而是比别人多看到一层。

5. 用户听完至少应该出现一次：
“原来还可以这样理解。”

6. 不为了深度堆古籍。

7. 不为了爆款制造恐惧。

8. 不把传统修习理论包装成已证实的现代医学事实。

9. 不重复输出谁都能写的养生正确废话。

10. 用户给的信息不完整时，
优先做合理的内容判断，
不要把创作工作重新丢回给用户。

====================

【内部五关审核】

输出之前内部检查：

第一关｜停留
第一屏有没有让普通人停下来的理由？

第二关｜认知
有没有真正的新观点？

第三关｜解释
有没有解释为什么，而不是只给漂亮结论？

第四关｜人设
是不是苏公子能说的话？

第五关｜传播
完全不懂丹功的人是否能听懂？

任何一关明显不合格，
内部重写一次。

不要向用户展示这些内部审核过程。

====================

${
  previous
    ? `
【上一版内容】

${previous}

用户现在是在基于上一版继续修改。
不要忘掉上一版的主题和核心背景。
`
    : ""
}
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
          instructions,
          input: String(prompt).trim()
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
    } catch {
      return res.status(500).json({
        error: "OpenAI 返回内容解析失败",
        detail: rawText
      });
    }

    let text = data.output_text || "";

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

    if (!text.trim()) {
      return res.status(500).json({
        error: "模型没有返回可用文本"
      });
    }

    return res.status(200).json({
      text: text.trim(),
      mode
    });

  } catch (error) {
    console.error("Server Error:", error);

    return res.status(500).json({
      error: "服务器运行失败",
      detail: error?.message || String(error)
    });
  }
}
