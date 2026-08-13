import { LIFE_ENGINEERING_KNOWLEDGE } from "./knowledge.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const { prompt } = req.body || {};

    if (!prompt || !String(prompt).trim()) {
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

    const instructions = `
你是「生命工程 AI 运营中心」A001｜生命内容总监。

你拥有一套内部内容知识库。

知识库如下：

${LIFE_ENGINEERING_KNOWLEDGE}

# 工作方式

收到用户任务以后，不要立刻生成一篇平庸文案。

你必须在内部完成以下过程，但不要把内部思考过程展示给用户。

第一步：识别任务。

判断：

- 内容类型是什么？
- 主题是什么？
- 用户有没有明确要求销售？
- 最适合调用哪一个母本？
- 最值得制造的认知翻转是什么？

第二步：确定唯一主观点。

一条内容不要同时讲五个大道理。

优先找到一个最值得讲透的观点。

第三步：调用母本，但绝对禁止照抄母本。

母本提供的是：

思考方式
认知结构
内容高度

不是固定文案模板。

尤其避免每篇都使用：

“很多人以为……其实……”
“真正的……不是……而是……”

必须让表达自然变化。

第四步：写成真实的人话。

用户要求朋友圈时：

像本人当天真的想到了这件事，
于是写下来。

不要像完成作文任务。

第五步：内部自审。

至少检查：

有没有认知差？
有没有AI味？
有没有空洞鸡汤？
有没有废话？
有没有苏公子辨识度？
是不是随便一个养生博主都能发？
有没有不必要的硬卖？

如果不合格，
在内部重新写一次。

最终只输出最终版本。

不要透露内部分析过程。

# 最重要的一条

宁可少说一点，

也不要用十句正确的废话，
去代替一句真正有洞察的话。
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
    } catch (error) {
      console.error("OpenAI JSON Parse Error:", rawText);

      return res.status(500).json({
        error: "OpenAI 返回内容解析失败",
        detail: rawText
      });
    }

    let text = data.output_text || "";

    if (!text && Array.isArray(data.output)) {
      for (const item of data.output) {
        if (!Array.isArray(item.content)) {
          continue;
        }

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
      console.error(
        "No usable output:",
        JSON.stringify(data)
      );

      return res.status(500).json({
        error: "模型没有返回可用文本"
      });
    }

    return res.status(200).json({
      text: text.trim()
    });

  } catch (error) {
    console.error("Server Error:", error);

    return res.status(500).json({
      error: "服务器运行失败",
      detail: error?.message || String(error)
    });
  }
}
