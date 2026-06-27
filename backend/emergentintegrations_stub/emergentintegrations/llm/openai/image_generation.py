class OpenAIImageGeneration:
    def __init__(self, api_key: str):
        self.api_key = api_key

    async def generate_images(self, prompt: str, model: str = "gpt-image-1", number_of_images: int = 1):
        raise NotImplementedError("emergentintegrations stub — fitur AI tidak tersedia di local dev")
