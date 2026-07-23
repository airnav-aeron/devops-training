pipeline {
    agent any
    
    environment {
        // Your private warehouse IP (now pulled securely from Jenkins credentials)
        REGISTRY = credentials('private-registry-ip')
        APP_NAME = "sample-app"
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
                script {
                    // Generate industry-standard version tag based on Git commit hash
                    env.IMAGE_TAG = sh(script: 'git rev-parse --short HEAD', returnStdout: true).trim()
                }
                // Runs Ton's Dockerfile
                sh "docker build --build-arg BUILD_VERSION=${env.IMAGE_TAG} -t ${REGISTRY}/${APP_NAME}:${env.IMAGE_TAG} ."
            }
        }
        
        stage('Push to Private Registry') {
            steps {
                // Pushes to your warehouse on the .23 server
                sh "docker push ${REGISTRY}/${APP_NAME}:${env.IMAGE_TAG}"
            }
        }
        
        stage('Update Config Repo (GitOps)') {
            steps {
                withCredentials([string(credentialsId: 'github-token', variable: 'GIT_TOKEN')]) {
                    sh """
                    # 1. Setup the Jenkins robot identity
                    git config --global user.email "bunswkwk@gmail.com"
                    git config --global user.name "airnav-aeron"

                    # 2. Clean up any old folders from previous runs
                    rm -rf config-k8s

                    # 3. Clone Deyb's Config Repo (Targeting the staging branch)
                    git clone -b staging https://${GIT_TOKEN}@github.com/sylthecatto/config-k8s.git
                    cd config-k8s

                    # 4. Swap the old image for the newly built one inside the staging folder
                    sed -i "s|image: .*|image: ${REGISTRY}/${APP_NAME}:${env.IMAGE_TAG}|g" staging/statefulset.yaml

                    # 5. Commit and push the changes back to GitHub
                    git add staging/statefulset.yaml
                    git commit -m "Jenkins automated push: Update image to ${env.IMAGE_TAG}"
                    git push origin staging
                    """
                }
            }
        }
    }
}