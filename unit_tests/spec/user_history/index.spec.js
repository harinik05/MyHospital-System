const { S3Client } = require("@aws-sdk/client-s3");
const app = require("/Users/harinikarthik/Documents/GitHub/MyHospital-System/user_history/index.js");
const {mockClient} = require("aws-sdk-client-mock");


describe('Upload file to S3 Bucket', () => {
    let S3;
    beforeEach(() =>{
        S3 = mockClient(AWS.S3);
    });
    afterEach(() => {
        S3.restore();
    });
    const bucketName = 'your-bucket-name';
    const key = 'test/file.txt';
    const filePath = 'path/to/your/file.txt';

    // Test case: Successful upload
    it('should upload a file to S3 successfully', async () => {
        const S3 = mockClient(AWS.S3);
        // Mock the S3 upload function to resolve with a success message
        S3.mockResolvedValueOnce('upload', { Location: 'https://s3.amazonaws.com/bucket/test/file.txt' });

        try {
            const result = await uploadFileToS3(bucketName, key, filePath, S3);
            expect(result).toBe('https://s3.amazonaws.com/bucket/test/file.txt');
        } catch (error) {
            // Handle any unexpected errors
            throw error;
        } 
    });

    // Test case: Error during upload
    it('should handle an error during S3 upload', async () => {
        
        // Mock the S3 upload function to reject with an error
        S3.mockRejectedValueOnce('upload', new Error('Upload failed'));

        try {
            await uploadFileToS3(bucketName, key, filePath, S3);
        } catch (error) {
            expect(error.message).toBe('Upload failed');
        } 
    });
});


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






