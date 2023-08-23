const AWS = require("aws-sdk");
const {S3Client, GetObjectCommand} = require("@aws-sdk/client-s3");
const {marshall} = require("@aws-sdk/util-dynamodb");
const {SecretsManagerClient, GetSecretValueCommand} = require("@aws-sdk/client-secrets-manager");
const apiGatewayClient = require("aws-api-gateway-client").default;
const{DynamoDBClient, QueryCommand, BatchWriteItemCommand} = require("@aws-sdk/client-dynamodb");

const init = () =>{
    const PATIENT_HISTORY_TABLE = process.env.PatientDynamoDB;
    const PATIENT_REGISTRATION_S3_BUCKET = process.env.PatientS3Bucket;
    const PATIENT_REGISTRATION_S3_KEY = process.env.PatientS3Key;
    const PATIENT_APIG_URL = process.env.PatientAPIGURL;
    const PATIENT_APIG_PATH = process.env.PatientAPIGPath;
    const PATIENT_APIG_SECRET_KEY = process.env.PatientAPIGSecretKey;
    const AWS_REGION = process.env.AWSRegion;

    const dynamoDbClient = new DynamoDBClient({region: AWS_REGION});
    const S3Client = new S3Client({region: AWS_REGION});
    const secretsManClient = new SecretsManagerClient({region: AWS_REGION});

    return{
        PATIENT_HISTORY_TABLE, 
        PATIENT_REGISTRATION_S3_BUCKET,
        PATIENT_REGISTRATION_S3_KEY,
        PATIENT_APIG_URL,
        PATIENT_APIG_PATH,
        PATIENT_APIG_SECRET_KEY,
        dynamoDbClient,
        S3Client,
        secretsManClient,
    }
}

const main=async event=>{
    const initialConfig = init();
    
}

module.exports = {
    init,
}
