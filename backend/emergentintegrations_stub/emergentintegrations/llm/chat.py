class ImageContent:
    def __init__(self, image_base64: str = "", mime_type: str = "image/jpeg"):
        self.image_base64 = image_base64
        self.mime_type = mime_type

class UserMessage:
    def __init__(self, text: str = "", file_contents=None):
        self.text = text
        self.file_contents = file_contents or []

class LlmChat:
    def __init__(self, api_key: str, session_id: str = "", system_message: str = ""):
        self.api_key = api_key

    def with_model(self, provider: str, model: str):
        return self

    async def send_message(self, message):
        raise NotImplementedError("emergentintegrations stub — fitur AI tidak tersedia di local dev")
