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


describe('sendPasswordResetToken', () => {
    let mockCognitoUser;

    const username = 'testuser';

    beforeEach(() => {
        // Create a mock CognitoUser instance using the mock client SDK
        mockCognitoUser = new AmazonCognitoIdentity.CognitoUser({
            Username: username,
            Pool: {} // You can provide additional mock data if needed
        });

        // Spy on the forgotPassword method of the mock CognitoUser instance
        spyOn(mockCognitoUser, 'forgotPassword');
    });

    // Test case: Successful password reset initiation
    it('should initiate a password reset and log a success message', (done) => {
        // Mock a successful password reset initiation
        mockCognitoUser.forgotPassword.and.callFake((callbacks) => {
            callbacks.onSuccess(); // Simulate a successful password reset initiation
        });

        // Call the function
        app.sendPasswordResetToken(username);

        // Use a setTimeout to allow the asynchronous code to execute
        setTimeout(() => {
            // Expect the forgotPassword method to be called
            expect(mockCognitoUser.forgotPassword).toHaveBeenCalled();

            // Expect a success message to be logged
            expect(console.log).toHaveBeenCalledWith('Password reset initiated. A confirmation code has been sent to your email.');

            done(); // Call done to signal that the test is complete
        }, 0);
    });

    // Test case: Failure during password reset initiation
    it('should handle a failure during password reset initiation and log an error message', (done) => {
        // Mock a failure during password reset initiation
        mockCognitoUser.forgotPassword.and.callFake((callbacks) => {
            callbacks.onFailure(new Error('Password reset failed'));
        });

        // Call the function
        app.sendPasswordResetToken(username);

        // Use a setTimeout to allow the asynchronous code to execute
        setTimeout(() => {
            // Expect the forgotPassword method to be called
            expect(mockCognitoUser.forgotPassword).toHaveBeenCalled();

            // Expect an error message to be logged
            expect(console.error).toHaveBeenCalledWith('Password reset initiation failed:', jasmine.any(Error));

            done(); // Call done to signal that the test is complete
        }, 0);
    });
});
  
  describe('authenticateAndWriteToDynamoDB', () => {
    let mockDBClient;
    let mockPutItem;
  
    beforeEach(() => {
      // Create mock functions for the DB client and its putItem method
      mockPutItem = jasmine.createSpy('putItem');
      mockDBClient = {
        putItem: mockPutItem,
      };
  
      // Replace AmazonCognitoIdentity with a mock object
      spyOn(AmazonCognitoIdentity, 'CognitoUser').and.returnValue({
        authenticateUser: (authDetails, callbacks) => {
          // Simulate a successful authentication
          callbacks.onSuccess({});
        },
      });
  
      // Replace the userPool with a mock object
      spyOn(AmazonCognitoIdentity, 'CognitoUserPool').and.returnValue(userPool);
  
      // Clear any previous spy calls
      mockPutItem.calls.reset();
    });
  
    it('should authenticate and write to DynamoDB', () => {
      const bodyJSON = {
        name: "Sophia Lee",
        email: "sophia@example.com",
        address: "444 Birch St",
        condition: "Nausea",
        isSubmitted: false,
        birthDate: "1989-07-30"
      };
  
      const dynamoDBTableName = 'YourTableName';
  
      // Call the function with the mock objects
      app.authenticateAndWriteToDynamoDB(bodyJSON, dynamoDBTableName, mockDBClient);
  
      // Verify that CognitoUser and putItem were called as expected
      expect(AmazonCognitoIdentity.CognitoUser).toHaveBeenCalled();
      expect(mockPutItem).toHaveBeenCalledWith({
        TableName: dynamoDBTableName,
        Item: {
          Name: { S: bodyJSON.name },
          Email: {S: bodyJSON.email},
          Address: {S: bodyJSON.address},
          Condition: {S: bodyJSON.condition},
          isSubmitted: {S: bodyJSON.isSubmitted},
          BirthDate: {S: bodyJSON.birthDate},
        },
      });
    });
  
    it('should handle authentication failure', () => {
      // Replace the CognitoUser mock to simulate authentication failure
      spyOn(AmazonCognitoIdentity, 'CognitoUser').and.returnValue({
        authenticateUser: (authDetails, callbacks) => {
          // Simulate authentication failure
          callbacks.onFailure('Authentication failed');
        },
      });
      const bodyJSON = {
        name: "Sophia Lee",
        email: "sophia@example.com",
        address: "444 Birch St",
        condition: "Nausea",
        isSubmitted: false,
        birthDate: "1989-07-30"
      };
  
      const dynamoDBTableName = 'YourTableName';
  
      // Call the function with the mock objects
      app.authenticateAndWriteToDynamoDB(bodyJSON, dynamoDBTableName, mockDBClient);
  
      // Verify that createUserInUserPool and error handling are called as expected
      expect(AmazonCognitoIdentity.CognitoUser).toHaveBeenCalled();
      expect(mockPutItem).not.toHaveBeenCalled(); // putItem should not be called on authentication failure
      // You can also add expectations for createUserInUserPool and error handling
    });
  });
  

describe('createUserInUserPool', () => {
  let mockUserPool;
  let mockSignUp;

  beforeEach(() => {
    // Create mock functions for the userPool and its signUp method
    mockSignUp = jasmine.createSpy('signUp');
    mockUserPool = {
      signUp: mockSignUp,
    };

    // Replace AmazonCognitoIdentity with a mock object
    spyOn(AmazonCognitoIdentity, 'CognitoUserPool').and.returnValue(mockUserPool);

    // Clear any previous spy calls
    mockSignUp.calls.reset();
  });

  it('should create a user in Cognito User Pool', () => {
    const username = 'testuser';

    // Call the function with the mock objects
    app.createUserInUserPool(username);

    // Verify that signUp was called with the expected arguments
    expect(mockSignUp).toHaveBeenCalledWith(
      username,
      jasmine.any(String), // You may want to add a matcher for the password
      null,
      null,
      jasmine.any(Function) // A callback function should be passed
    );

    // Simulate a successful signup
    const mockResult = {
      user: {
        getUsername: () => 'testuser',
      },
    };
    mockSignUp.calls.argsFor(0)[4](null, mockResult);

    // Add expectations for handling successful user creation
  });

  it('should handle signup error', () => {
    const username = 'testuser';

    // Call the function with the mock objects
    app.createUserInUserPool(username);

    // Verify that signUp was called with the expected arguments
    expect(mockSignUp).toHaveBeenCalledWith(
      username,
      jasmine.any(String), // You may want to add a matcher for the password
      null,
      null,
      jasmine.any(Function) // A callback function should be passed
    );

    // Simulate a signup error
    const mockError = new Error('Signup failed');
    mockSignUp.calls.argsFor(0)[4](mockError, null);

    // Add expectations for handling the signup error
  });
});








