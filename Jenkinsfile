pipeline {
    agent any
    
    environment {
        // Your private warehouse IP
        REGISTRY = "192.168.10.23:5000"
        APP_NAME = "sample-app"
        IMAGE_TAG = "v${env.BUILD_NUMBER}"
    }
    
    stages {
        stage('Checkout Code') {
            steps {
                // Downloads the latest code from GitHub
                checkout scm
            }
        }
        
        stage('Build Docker Image') {
            steps {
                // Runs Ton's Dockerfile
                sh "docker build -t ${REGISTRY}/${APP_NAME}:${IMAGE_TAG} ."
            }
        }
        
        stage('Push to Private Registry') {
            steps {
                // Pushes to your warehouse on the .23 server
                sh "docker push ${REGISTRY}/${APP_NAME}:${IMAGE_TAG}"
            }
        }
    }
}