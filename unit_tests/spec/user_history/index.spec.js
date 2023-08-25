const { S3Client } = require("@aws-sdk/client-s3");
const app = require("/Users/harinikarthik/Documents/GitHub/MyHospital-System/user_history/index.js");
const {mockClient} = require("aws-sdk-client-mock");

describe("I should be able to upload a file to S3 successfully", () =>{
    beforeEach(() => {
        S3Client.reset();
        apiGatewayClient.reset();
        DynamoDBClient.reset();
        SecretsManagerClient.reset();
    })
    afterEach(() => {
        process.env.awsRegion = "";
    })

    it('should upload a file to S3', (done) => {
        const bucketName = 'your-bucket';
        const key = 'your-key';
        const filePath = path.join(__dirname, 'test-file.txt'); // Replace with your test file path
      
        app.uploadFileToS3(bucketName, key, filePath, AWS.S3)
          .then((s3ObjectUrl) => {
            // Verify that the function returns the correct S3 object URL
            expect(s3ObjectUrl).toEqual('https://s3.example.com/your-bucket/your-key');
            done(); // Notify Jasmine that the asynchronous test is complete
          })
          .catch((error) => {
            // If an error occurs, fail the test
            done.fail(error);
          });
      });
      
      it('should handle S3 upload error', (done) => {
        // Simulate an S3 upload error
        mockClient.restore('S3', 'upload');
        mockClient.mock('S3', 'upload', (params, callback) => {
          // Simulate an S3 upload error
          callback(new Error('S3 upload failed'));
        });
      
        const bucketName = 'your-bucket';
        const key = 'your-key';
        const filePath = path.join(__dirname, 'test-file.txt'); // Replace with your test file path
      
        app.uploadFileToS3(bucketName, key, filePath, mockClient.S3Client)
          .then(() => {
            // The function should not resolve successfully
            done.fail('Function should have rejected the promise');
          })
          .catch((error) => {
            // Verify that the function handles S3 upload errors
            expect(error.message).toEqual('S3 upload failed');
            done(); // Notify Jasmine that the asynchronous test is complete
          });
      });     
})

describe('readJSONFile', () => {
    const validFilePath = path.join(__dirname, 'unit_tests/spec/user_history/patient_files/patient_file_01.json.json'); 
    const validFilePath_Duplicate = path.join(__dirname, 'unit_tests/spec/user_history/patient_files/patient_file_01_duplicate.json'); 
    const invalidFilePath = path.join(__dirname, 'unit_tests/spec/user_history/patient_file_01_duplicate.json'); 

    // Test case 1: Reading a valid JSON file
    it('should read a valid JSON file and return a JavaScript object', () => {
        const result = app.readJSONFile(validFilePath);
        const result_duplicate = app.readJSONFile(validFilePath_Duplicate);

        // Make assertions about the result
        expect(result).toEqual(jasmine.any(Object)); 
        expect(result_duplicate).toEqual(jasmine.any(Object));
        expect(result[0].name).toBe('Eva Garcia'); 
        expect(result_duplicate[3].name).toEqual(result[3].name);
    });

    // Test case 2: Handling an invalid JSON file
    it('should handle an invalid JSON file and return null', () => {
        const result = readJSONFile(invalidFilePath);

        // Make assertions about the result
        expect(result).toBeNull();
    });

});




