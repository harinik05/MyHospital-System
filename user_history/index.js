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
//Function that will return a success or failure after something is uploaded into S3
/*
use S3 Client to upload the file into S3 (this is what you redirect if the next function doesnt work properly)
*/



// Function that will incorporate the logic for uploading the form into S3
/*
for the given input name, check if the form already exists in S3 - should be a folder and contain a file
if it does exist = set the condition to true and return this
if it doesn't exist = circuilate back to the user and prompt them to do it = it won't allow you to process the event further (save in the db) = should throw error
*/




// Function that will take the input body and return in an object format that is parsable
/*
1. Full Name
2. Email 
3. Address
4. Condition that they are experiencing 
5. Form submission (S3) = yes or no = this is how you know that this is a first time patient or not
6. BOD
return this as an object with all the details and this object can be iterated over several users (done in the main handler function)
*/



//fuction that will check if the person has appropriate credentials so that they can edit their information
/*
authenticate via Cognito and Amplify https://dev.to/codebeast/how-to-create-a-record-in-dynamodb-when-a-user-signs-up-34e2
*/



//function that will take the array of object, marshall and save it into the dynamodb 
/*
The array of objects once formed must be parsed and saved into the dynamodb where 
partition key = full name
sort key = email (just in case there are multiple people of same name)
*/




const main=async event=>{
    const initialConfig = init();

}

module.exports = {
    init,
}
