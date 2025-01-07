# main.py (python example)

import os

from deepgram import (
    DeepgramClient,
    PrerecordedOptions,
    FileSource,
)

from dotenv import load_dotenv
load_dotenv()
# Path to the audio file
AUDIO_FILE = "spacewalk.mp3"

def main():
    try:
        # STEP 1 Create a Deepgram client using the API key
        deepgram = DeepgramClient(os.environ.get("DEEPGRAM_API_KEY"))

        with open(AUDIO_FILE, "rb") as file:
            buffer_data = file.read()

        payload: FileSource = {
            "buffer": buffer_data,
        }

        #STEP 2: Configure Deepgram options for audio analysis
        options = PrerecordedOptions(
            model="nova-2",
            smart_format=True,
        )

        # STEP 3: Call the transcribe_file method with the text payload and options
        response = deepgram.listen.rest.v("1").transcribe_file(payload, options)

        # STEP 4: Print the response
        print(response.to_json(indent=4))

    except Exception as e:
        print(f"Exception: {e}")


if __name__ == "__main__":
    main()