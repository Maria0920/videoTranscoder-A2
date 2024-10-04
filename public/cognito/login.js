import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  InitiateAuthCommand,
  AdminAddUserToGroupCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";

const region = "ap-southeast-2"; // Your AWS Region

// Create SSM Client
const ssmClient = new SSMClient({ region });

async function getParameter(name) {
  const command = new GetParameterCommand({
    Name: name,
    WithDecryption: true, // Set to true if you're using SecureString
  });

  const response = await ssmClient.send(command);
  return response.Parameter.Value;
}

// Function to handle user sign-up
async function signUp(username, password, email) {
  console.log("Signing up user...");

  const clientId = await getParameter("CLIENT_ID"); // Fetch Client ID from Parameter Store
  const client = new CognitoIdentityProviderClient({ region });

  const signUpCommand = new SignUpCommand({
    ClientId: clientId,
    Username: username,
    Password: password,
    UserAttributes: [{ Name: "email", Value: email }],
  });

  try {
    const signUpRes = await client.send(signUpCommand);
    console.log("Sign-up successful:", signUpRes);

    // Check if the user should be an admin
    if (email.endsWith("@admin.com") && password === "Admin123!") {
      await addUserToGroup(username, "Admin"); // Add user to Admin group
    } else {
      await addUserToGroup(username, "Users"); // Add user to Users group
    }

    // After successful sign-up, log the user in automatically
    const loginRes = await login(username, password);
    console.log("Login successful:", loginRes);

    return { signUpRes, loginRes };
  } catch (err) {
    console.error("Error during sign-up:", err);
    handleSignUpErrors(err);
    throw err;
  }
}

// Function to add user to a specified group
async function addUserToGroup(username, groupName) {
  const adminAddUserToGroupCommand = new AdminAddUserToGroupCommand({
    UserPoolId: await getParameter("USER_POOL_ID"), // Fetch User Pool ID from Parameter Store
    Username: username,
    GroupName: groupName,
  });

  try {
    await client.send(adminAddUserToGroupCommand);
    console.log(`User ${username} added to group ${groupName}.`);
  } catch (err) {
    console.error("Error adding user to group:", err);
  }
}

// Function to handle user login
async function login(username, password) {
  console.log("Logging in with:", username); // Log the username

  const clientId = await getParameter("CLIENT_ID"); // Fetch Client ID from Parameter Store
  const client = new CognitoIdentityProviderClient({ region });

  const command = new InitiateAuthCommand({
    AuthFlow: "USER_PASSWORD_AUTH",
    ClientId: clientId,
    AuthParameters: {
      USERNAME: username,
      PASSWORD: password,
    },
  });

  try {
    const response = await client.send(command);
    console.log("Login successful:", response);

    const { AccessToken, IdToken, RefreshToken } =
      response.AuthenticationResult;
    storeTokens(AccessToken, IdToken, RefreshToken);

    console.log("Login completed without MFA");
    return response; // Return the response for further use
  } catch (err) {
    console.error("Login error:", err);
    handleLoginError(err);
    throw err; // Rethrow error if needed
  }
}

// Function to securely store the tokens (e.g., in localStorage or sessionStorage)
function storeTokens(accessToken, idToken, refreshToken) {
  localStorage.setItem("accessToken", accessToken);
  localStorage.setItem("idToken", idToken);
  localStorage.setItem("refreshToken", refreshToken);
  console.log("Tokens stored successfully:", {
    accessToken,
    idToken,
    refreshToken,
  });
}

// Handle sign-up errors
function handleSignUpErrors(err) {
  switch (err.name) {
    case "UsernameExistsException":
      console.error("The username is already taken. Please choose another.");
      break;
    case "InvalidPasswordException":
      console.error("The password does not meet the security requirements.");
      break;
    case "InvalidParameterException":
      console.error(
        "Invalid parameters. Ensure the email and password are valid."
      );
      break;
    case "CodeDeliveryFailureException":
      console.error(
        "Failed to deliver confirmation code. Check your email service."
      );
      break;
    default:
      console.error(`Sign-up failed: ${err.message}`);
  }
}

// Function to handle different types of login errors
function handleLoginError(err) {
  console.error("Error details:", err);
  switch (err.name) {
    case "UserNotFoundException":
      console.error("The username does not exist.");
      break;
    case "NotAuthorizedException":
      console.error("The username or password is incorrect.");
      break;
    case "UserNotConfirmedException":
      console.error("The user is not confirmed. Please confirm your account.");
      break;
    case "PasswordResetRequiredException":
      console.error("Password reset is required.");
      break;
    case "InvalidParameterException":
      console.error("Invalid parameters. Check the input values.");
      break;
    default:
      console.error(`Unexpected error: ${err.message}`);
  }
}

// Example usage (optional)
const username = "exampleuser";
const password = "SecurePassword123!";
const email = "example@example.com";

// Call the sign-up function
signUp(username, password, email)
  .then(() => console.log("User signed up and logged in successfully!"))
  .catch((err) => console.error("Sign-up or login failed:", err));

export { login, signUp }; // Export the login and signUp functions if needed in other files
