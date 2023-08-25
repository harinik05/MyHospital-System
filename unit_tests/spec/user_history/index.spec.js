const { S3Client } = require("@aws-sdk/client-s3");
const app = require("/Users/harinikarthik/Documents/GitHub/MyHospital-System/user_history/index.js");
const {mockClient} = require("aws-sdk-client-mock");


describe('Upload file to S3 Bucket', () => {
    let S3;
    beforeEach(() =>{
        S3 = mockClient(S3Client);
    });
    afterEach(() => {
        S3.restore();
    });
    const bucketName = 'your-bucket-name';
    const key = 'test/file.txt';
    const filePath = 'path/to/your/file.txt';

    // Test case: Successful upload
    it('should upload a file to S3 successfully', async () => {
        // Mock the S3 upload function to resolve with a success message
        S3.mockResolvedValueOnce('upload', { Location: 'https://s3.amazonaws.com/bucket/test/file.txt' });

        try {
            const result = await app.uploadFileToS3(bucketName, key, filePath, S3);
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
            await app.uploadFileToS3(bucketName, key, filePath, S3);
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
        const result = app.readJSONFile(invalidFilePath);

        // Make assertions about the result
        expect(result).toBeNull();
    });

});

describe('checkFolderForPDF', () => {
    let S3;

    const bucketName = 'your-bucket-name';
    const folderName = 'your-folder-name';

    beforeEach(() => {
        // Create a new mock S3 instance for each test case
        S3 = mockClient(S3Client);
    });

    afterEach(() => {
        // Restore the original behavior of the mock after each test case
        S3.restore();
    });

    // Test case: PDF file exists in the folder
    it('should return true if a PDF file exists in the folder', async () => {
        // Mock the S3 listObjects method to return objects with a PDF file
        S3.mockResolvedValueOnce('listObjects', {
            Contents: [
                { Key: 'your-folder-name/file1.pdf' },
                { Key: 'your-folder-name/file2.txt' },
            ],
        });

        const result = await app.checkFolderForPDF(bucketName, folderName, S3);
        expect(result).toBe(true);
    });

    // Test case: No PDF file in the folder
    it('should return false if no PDF file exists in the folder', async () => {
        // Mock the S3 listObjects method to return objects without a PDF file
        S3.mockResolvedValueOnce('listObjects', {
            Contents: [
                { Key: 'your-folder-name/file1.txt' },
                { Key: 'your-folder-name/file2.jpg' },
            ],
        });

        const result = await app.checkFolderForPDF(bucketName, folderName, S3);
        expect(result).toBe(false);
    });

    // Test case: Error occurred during the operation
    it('should handle an error during the S3 operation and return false', async () => {
        // Mock the S3 listObjects method to throw an error
        S3.mockRejectedValueOnce('listObjects', new Error('S3 operation failed'));

        const result = await app.checkFolderForPDF(bucketName, folderName, S3);
        expect(result).toBe(false);
    });
});

describe('parsePatientInfo', () => {
    // Mock patient data in JSON format
    const patientJSON = `
        [
            {
                "name": "John Doe",
                "email": "john@example.com",
                "address": "123 Main St",
                "condition": "Fever",
                "isSubmitted": false,
                "birthDate": "1990-01-01"
            },
            {
                "name": "Jane Smith",
                "email": "jane@example.com",
                "address": "456 Elm St",
                "condition": "Cough",
                "isSubmitted": false,
                "birthDate": "1985-05-15"
            }
        ]
    `;

    
    // Spy on console.error to check for error logs
    let consoleErrorSpy;
    
    beforeEach(() => {
        consoleErrorSpy = spyOn(console, 'error');
    });

    // Test case: Successful parsing of patient data
    it('should parse patient data and return an array of patient objects', () => {
        app.checkFolderForPDF.and.returnValue(true); // Set the mock to return true

        const parsedPatients = app.parsePatientInfo(patientJSON, app.checkFolderForPDF);
        
        expect(parsedPatients).toEqual([
            {
                name: 'John Doe',
                email: 'john@example.com',
                address: '123 Main St',
                condition: 'Fever',
                isSubmitted: true, // Check if isSubmitted is set to true
                birthDate: '1990-01-01'
            },
            {
                name: 'Jane Smith',
                email: 'jane@example.com',
                address: '456 Elm St',
                condition: 'Cough',
                isSubmitted: true, // Check if isSubmitted is set to true
                birthDate: '1985-05-15'
            }
        ]);
        expect(app.checkFolderForPDF).toHaveBeenCalled(); // Ensure checkFolderForPDF was called
        expect(consoleErrorSpy).not.toHaveBeenCalled(); // Ensure no error was logged
    });

    // Test case: Handling invalid patient data
    it('should handle invalid patient data and return an empty array', () => {
        app.checkFolderForPDF.and.returnValue(false); // Set the mock to return false

        const invalidJSON = 'Invalid JSON'; // Simulate invalid JSON
        
        const parsedPatients = app.parsePatientInfo(invalidJSON, checkFolderForPDF);
        
        expect(parsedPatients).toEqual([]); // Expect an empty array due to parsing error
        expect(app.checkFolderForPDF).toHaveBeenCalled(); // Ensure checkFolderForPDF was called
        expect(consoleErrorSpy).toHaveBeenCalled(); // Ensure an error was logged
    });
});






