const AWS = require("aws-sdk");
const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const { marshall } = require("@aws-sdk/util-dynamodb");
const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");
const apiGatewayClient = require("aws-api-gateway-client").default;
const { DynamoDBClient, QueryCommand, BatchWriteItemCommand } = require("@aws-sdk/client-dynamodb");
const bodyJSONPath = "user_history/patient_data.json";
const { AmazonCognitoIdentity } = require('amazon-cognito-identity-js');
const path = require('path'); // Import path for file path
const { appSyncClient } = require("aws-appsync").default;
const gql = require("graphql-tag");

const init = () => {
    const PATIENT_HISTORY_TABLE = process.env.PatientDynamoDB;
    const PATIENT_REGISTRATION_S3_BUCKET = process.env.PatientS3Bucket;
    const PATIENT_REGISTRATION_S3_KEY = process.env.PatientS3Key;
    const PATIENT_REGISTRATION_S3_PATH = process.env.PatientS3Path;
    const PATIENT_APIG_URL = process.env.PatientAPIGURL;
    const PATIENT_APPS_URL = process.env.PatientAPPSURL;

    const PATIENT_APIG_PATH = process.env.PatientAPIGPath;
    const PATIENT_APIG_SECRET_KEY = process.env.PatientAPIGSecretKey;
    const AWS_REGION = process.env.AWSRegion;
    const POOL_DATA = {
        UserPoolId: 'YOUR_USER_POOL_ID',
        ClientId: 'YOUR_APP_CLIENT_ID'
    };
    const userPool = new AmazonCognitoIdentity.CognitoUserPool(POOL_DATA);
    const dynamoDbClient = new DynamoDBClient({ region: AWS_REGION });
    const S3Client = new S3Client({ region: AWS_REGION });
    const secretsManClient = new SecretsManagerClient({ region: AWS_REGION });
    const appsyncclient = new appSyncClient({
        url: PATIENT_APPS_URL, 
        region: AWS_REGION, 
        auth: {
            type: "AWS_IAM", 
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
                sessionToken: process.env.AWS_SESSION_TOKEN, 
            },
        },
    })

    const QueryForAppSync = gql`
        query QueryForAppSync{
            getPatientData{
                name
                email
                address
                condition
                isSubmitted
                birthDate
            }
        }`

    return {
        PATIENT_HISTORY_TABLE,
        QueryForAppSync,
        PATIENT_REGISTRATION_S3_BUCKET,
        PATIENT_REGISTRATION_S3_KEY,
        PATIENT_APIG_URL,
        PATIENT_APIG_PATH,
        PATIENT_APIG_SECRET_KEY,
        PATIENT_REGISTRATION_S3_PATH,
        dynamoDbClient,
        appsyncclient,
        S3Client,
        secretsManClient,
        POOL_DATA,
        userPool,
    }
}

//Function that will take input from aPPsync
async function takeAppSyncInput(){
    try {
        // Perform the AWS AppSync query
        const response = await appsyncclient.query({
            query: QueryForAppSync,
        });

        // Handle the response
        console.log("AWS AppSync Response:", response);

        // Return a response to the client
        return {
            statusCode: 200,
            body: JSON.stringify(response.data),
        };
    } catch (error) {
        console.error("Error invoking AWS AppSync:", error);

        // Return an error response to the client
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal Server Error" }),
        };
    }
};


//Function for returning a response from AppSync
//Function that will return a success or failure after something is uploaded into S3
/*
use S3 Client to upload the file into S3 (this is what you redirect if the next function doesnt work properly)
*/

function uploadFileToS3(bucketName, key, filePath, S3Client) {
    /*
    1. Initially, takes the params such as bucket name and reads 
    the file as a stream
    */
    const params = {
        Bucket: bucketName,
        Key: key,
        Body: require('fs').createReadStream(filePath)
    };

    /*
    2. Returns a promise if the s3 upload has been successful 
    If its successful, then it returns success message and location of file
    If it failed, then it will error out and exit this function
    */
    return new Promise((resolve, reject) => {
        S3Client.upload(params, (err, data) => {
            if (err) {
                console.error('Error uploading file to S3:', err);
                reject(err);
            } else {
                console.warn('File uploaded successfully:', data.Location);
                resolve(data.Location);
            }
        });
    });
}

//Function that will read the JSON file and return the BodyJSON
function readJSONFile(filePath) {
    try {
        // Read the JSON file synchronously
        const jsonData = fs.readFileSync(filePath, 'utf-8');

        // Parse the JSON data into a JavaScript object
        const jsonDataAsObject = JSON.parse(jsonData);

        return jsonDataAsObject;
    } catch (error) {
        console.error('Error reading or parsing the JSON file:', error);
        return null; // Return null in case of an error
    }
}

// Function that will incorporate the logic for uploading the form into S3
/*
for the given input name, check if the form already exists in S3 - should be a folder and contain a file
if it does exist = set the condition to true and return this
if it doesn't exist = circuilate back to the user and prompt them to do it = it won't allow you to process the event further (save in the db) = should throw error
*/
async function checkFolderForPDF(bucketName, folderName, S3Client) {
    try {
        // List objects in the specified folder
        const listObjectsParams = {
            Bucket: bucketName,
            Prefix: `${folderName}/` // Use the specified folder as a prefix
        };

        const { Contents } = await s3.listObjects(listObjectsParams).promise();

        // Check if there are any objects in the folder
        if (Contents.length === 0) {
            return false; // No objects found in the folder
        }

        // Check if there is a PDF file in the folder
        const pdfFileExists = Contents.some((object) =>
            object.Key.toLowerCase().endsWith('.pdf')
        );

        return pdfFileExists;
    } catch (error) {
        console.error('Error checking folder for PDF:', error);
        return false; // An error occurred
    }
}


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
function parsePatientInfo(patientJSON) {
    try {
        // Parse the JSON string into an object
        const patientData = JSON.parse(patientJSON);

        // Check if the parsed data is an array
        if (!Array.isArray(patientData)) {
            throw new Error('Input data is not an array.');
        }

        // Create an array to store the parsed patient objects
        const parsedPatients = [];

        // Iterate over each patient object in the array
        for (const patient of patientData) {
            // Extract the desired information from each patient object
            const { name, email, address, condition, isSubmitted, birthDate } = patient;
            if (checkFolderForPDF === true) {
                isSubmitted = true;
                // Create a new object with the extracted information
                const parsedPatient = {
                    name,
                    email,
                    address,
                    condition,
                    isSubmitted,
                    birthDate
                };

                // Add the parsed patient object to the result array
                parsedPatients.push(parsedPatient);
            }
        }

        return parsedPatients;
    } catch (error) {
        console.error('Error parsing patient data:', error);
        return []; // Return an empty array in case of errors
    }
}

//Function to give password for cognito
function sendPasswordResetToken(username) {
    const userData = {
        Username: username,
        Pool: userPool
    };

    const cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);

    cognitoUser.forgotPassword({
        onSuccess: () => {
            console.log('Password reset initiated. A confirmation code has been sent to your email.');
            // Handle success, prompt user for the confirmation code and new password
        },
        onFailure: (err) => {
            console.error('Password reset initiation failed:', err);
            // Handle failure
        },
        inputVerificationCode: () => {
            // Prompt user for the verification code and new password
        }
    });
}
//fuction that will check if the person has appropriate credentials so that they can edit their information
/*
authenticate via Cognito 
*/
function authenticateAndWriteToDynamoDB(bodyJSON, dynamoDBTableName, dbClient) {
    const { name } = bodyJSON; // Replace with your expected body JSON properties

    const authenticationData = {
        Username: username,
        Password: sendPasswordResetToken(username)
    };

    const authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails(authenticationData);

    const userData = {
        Username: username,
        Pool: userPool
    };

    const cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);

    cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: (session) => {
            // Authentication successful, now you can write to DynamoDB

            // Construct the item to be written to DynamoDB
            const params = {
                TableName: dynamoDBTableName,
                Item: {
                    // Define your DynamoDB item attributes here
                    Name: { S: name },
                    Email: { S: bodyJSON[name].email },
                    Address: { S: bodyJSON[name].address },
                    Condition: { S: bodyJSON[name].condition },
                    isSubmitted: { S: bodyJSON[name].isSubmitted },
                    birthDate: { S: bodyJSON[name].birthDate },
                }
            };

            // Write data to DynamoDB
            dbClient.putItem(params, (err, data) => {
                if (err) {
                    console.error('Error writing to DynamoDB:', err);
                    // Handle the error appropriately
                } else {
                    console.log('Data written to DynamoDB:', data);
                    // Data successfully written to DynamoDB
                }
            });
        },
        onFailure: (err) => {
            createUserInUserPool(username);
            console.error('Authentication failed:', err);
            // Handle authentication failure
        },
    });
}


//function that will check that once an authentication fails it will head over to create one username
/*
Must create a username in the user pool along with a password
*/
function createUserInUserPool(username) {
    const password = sendPasswordResetToken(username);
    userPool.signUp(username, password, null, null, (err, result) => {
        if (err) {
            console.error('Error creating user in Cognito User Pool:', err);
            // Handle the error appropriately
        } else {
            const cognitoUser = result.user;
            console.warn('User created in Cognito User Pool:', cognitoUser.getUsername());
            // Handle successful user creation
        }
    });
}

const main = async event => {
    const initialConfig = init();
    //app sync input
    takeAppSyncInput()
    //Upload the form detail to S3 - Calling this function 
    uploadFileToS3(PATIENT_REGISTRATION_S3_BUCKET, PATIENT_REGISTRATION_S3_KEY, PATIENT_REGISTRATION_S3_PATH, S3Client.initialConfig)
        .then((s3ObjectUrl) => {
            console.log('File uploaded to S3:', s3ObjectUrl);
        })
        .catch((error) => {
            console.error('Error uploading file to S3:', error);
        });

    //for each of the input name that comes in 
    checkFolderForPDF(PATIENT_REGISTRATION_S3_BUCKET, PatientName)
        .then((result) => {
            if (result) {
                console.log('PDF file found in the folder.');
            } else {
                console.log('No PDF file found in the folder.');
            }
        })
        .catch((error) => {
            console.error('Error checking folder for PDF:', error);
        });

    const jsonData = readJSONFile(filePath);

    if (jsonData !== null) {
        console.warn('JSON data:', jsonData);
    } else {
        console.log('Unable to read or parse the JSON file.');
    }

    //This will contain the parsed list of all patients
    const parsedPatients = parsePatientInfo(jsonData);
    authenticateAndWriteToDynamoDB(parsedPatients, PATIENT_HISTORY_TABLE, dbClient);

}

module.exports = {
    init,
    createUserInUserPool,
    authenticateAndWriteToDynamoDB,
    sendPasswordResetToken,
    parsePatientInfo,
    checkFolderForPDF,
    readJSONFile,
    uploadFileToS3,
    main,
}
