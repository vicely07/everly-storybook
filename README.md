# Everly: Multimodal Creative Storyteller for Memories

Everly is a compassionate, AI-powered application designed to capture, preserve, and narrate the life stories and memories of individuals, particularly those experiencing cognitive decline or dementia. 

At its core, Everly acts as a **multimodal creative storyteller**, transforming fragmented memories, uploaded photos, and audio recordings into cohesive, heartwarming narratives.

## ✨ Key Feature: Mixed Output Interleaved Generation

Everly heavily leverages the Gemini API's advanced multimodal capabilities to produce **mixed output interleaved** narratives. 

Instead of generating a standard block of text followed by a single image, Everly synthesizes a rich, storybook-like experience. It prompts the AI to generate poetic text and beautiful, context-aware illustrations (like watercolor paintings of the user's favorite things) that are **seamlessly interleaved together** in a single response stream. 

This interleaved multimodal output creates a highly engaging, visual, and emotional "Digital Memory Book" tailored specifically to the patient's life, loves, and history.

## 🚀 How to Run and Deploy

### Prerequisites
- Node.js installed locally
- Google Cloud CLI (`gcloud`) installed and authenticated (Note: The `gcloud` CLI is the primary tool of the Google Cloud SDK)
- A Gemini API Key

### Local Development
1. Install the project dependencies:
   ```bash
   npm install
   ```
2. Set up your environment variables (ensure your Gemini API key is configured).
3. Start the local development server:
   ```bash
   npm run dev
   ```

### Deploying to Google Cloud Run via Docker

You can build and deploy this application directly using the provided `Dockerfile`, bypassing the need for local Node/npm builds. 

1. **Build and push the container image to Google Container Registry:**
   ```bash
   gcloud builds submit --tag gcr.io/[YOUR_PROJECT_ID]/[YOUR_SERVICE_NAME]
   ```

2. **Deploy the container image to Cloud Run:**
   ```bash
   gcloud run deploy [YOUR_SERVICE_NAME] \
     --image gcr.io/[YOUR_PROJECT_ID]/[YOUR_SERVICE_NAME] \
     --region [YOUR_REGION] \
     --port [YOUR_PORT] \
     --allow-unauthenticated \
     --project [YOUR_PROJECT_ID]
   ```

**Deployment Flags Explained:**
* `--image ...`: Points Cloud Run to the Docker container image you just built.
* `--region [YOUR_REGION]`: Specifies the Google Cloud region where your service will be hosted (e.g., `us-central1`).
* `--port [YOUR_PORT]`: Tells Cloud Run to route external traffic to this port on your container (e.g., `8080`).
* `--allow-unauthenticated`: Makes the web service publicly accessible over the internet.
* `--project [YOUR_PROJECT_ID]`: Specifies your target Google Cloud project ID.

### Automating Cloud Deployment (CI/CD)

You can automate this deployment process so that every time you commit code to your Git repository, it automatically builds and deploys to Google Cloud Run using the included `cloudbuild.yaml` file.

**To set up automatic deployments via Google Cloud Build:**
1. Navigate to the **Cloud Build > Triggers** page in the Google Cloud Console.
2. Click **Connect Repository** to authorize and link your source code repository (e.g., GitHub or Bitbucket).
3. Click **Create Trigger**.
4. Configure the trigger:
   - **Event:** Select **Push to a branch**.
   - **Source:** Select your connected repository and your deployment branch (e.g., `main`).
   - **Configuration:** Select **Cloud Build configuration file (yaml or json)** and ensure it points to `/cloudbuild.yaml`.
5. Click **Create**. 

Now, every `git push` to your configured branch will automatically trigger a new Docker build and deploy the updated container to Cloud Run!

## 🧩 App Components & Architecture

### The Gemini API Integration
Everly is powered by the `@google/genai` SDK, utilizing models like `gemini-3-flash-preview` for rapid reasoning and `gemini-2.5-flash-image` for visual synthesis. The application makes complex, multimodal calls to the Gemini API:
1. **Input Processing:** The app accepts a variety of inputs—text notes, audio recordings (which are transcribed), and uploaded photos.
2. **Contextual Prompting:** These inputs are bundled together into a rich context window. The system prompts Gemini not just to summarize, but to act as a compassionate storyteller.
3. **Structured JSON Responses:** To ensure the UI can render the storybook correctly, the Gemini API is instructed to return a structured JSON schema representing the narrative flow.

### Mastering Interleaved Output
The magic of Everly lies in its **interleaved output**. When the `compileBookNarrative` function is called, the Gemini API doesn't just return a wall of text. It returns an array of "pages" or "blocks" where text and imagery are mixed.

**How it works:**
1. **Text Generation:** The AI writes a paragraph of the story based on the provided memories.
2. **Image Prompt Generation:** Alongside the text, the AI generates a highly specific *image prompt* (e.g., "A watercolor painting of a vintage red bicycle leaning against an oak tree").
3. **Image Synthesis:** The app then calls the `gemini-2.5-flash-image` model using these generated prompts to create the actual illustrations.
4. **Interleaved Rendering:** The React frontend (`CaregiverMode.tsx` and the Storybook viewer) maps over this data, rendering a text block, followed by its corresponding synthesized image, followed by the next text block. 

This creates a seamless, interleaved reading experience that mimics a real, beautifully illustrated memory book, making the output far more engaging and accessible for the end-user.
