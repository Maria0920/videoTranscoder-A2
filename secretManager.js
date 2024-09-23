import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";

const secret_name = "n11794615-jwt-secret";
const client = new SecretsManagerClient({ region: "ap-southeast-2" });

async function main() {
  try {
    const response = await client.send(
      new GetSecretValueCommand({
        SecretId: secret_name,
      })
    );
    const secret = response.SecretString;
    console.log(secret);
  } catch (error) {
    console.log(error);
  }
}

main();
