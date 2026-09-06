from openai import OpenAI

class LLM:
    def __init__(self, api_key="", model="gpt-4o-mini", base_url=None):
        self.enabled = bool(api_key)
        self.model = model
        self.client = None
        if self.enabled:
            kwargs = {"api_key": api_key}
            if base_url:
                kwargs["base_url"] = base_url
            self.client = OpenAI(**kwargs)

    def ask(self, messages):
        if not self.enabled:
            return None
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=0.4,
                max_tokens=500,
            )
            return response.choices[0].message.content.strip()
        except Exception as exc:
            print(f"[LLM warning] {exc}")
            return None
