name: Deploy to Google Cloud Run

on:
  push:
    branches:
      - main

env:
  PROJECT_ID: ${{ secrets.GCP_PROJECT_ID }}
  REGION: us-central1
  SERVICE: everly-app

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    permissions:
      contents: 'read'
      id-token: 'write'

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Google Auth
        id: auth
        uses: 'google-github-actions/auth@v2'
        with:
          workload_identity_provider: '${{ secrets.WIF_PROVIDER }}'
          service_account: '${{ secrets.WIF_SERVICE_ACCOUNT }}'

      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v2

      - name: Authorize Docker push
        run: gcloud auth configure-docker gcr.io

      - name: Build and Push Container
        run: |-
          docker build -t gcr.io/${{ env.PROJECT_ID }}/${{ env.SERVICE }}:${{ github.sha }} .
          docker push gcr.io/${{ env.PROJECT_ID }}/${{ env.SERVICE }}:${{ github.sha }}

      - name: Deploy to Cloud Run
        id: deploy
        uses: google-github-actions/deploy-cloudrun@v2
        with:
          service: ${{ env.SERVICE }}
          region: ${{ env.REGION }}
          image: gcr.io/${{ env.PROJECT_ID }}/${{ env.SERVICE }}:${{ github.sha }}
          flags: '--allow-unauthenticated'

      - name: Show Output
        run: echo ${{ steps.deploy.outputs.url }}
