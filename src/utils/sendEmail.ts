const SibApiV3Sdk = require("sib-api-v3-sdk");


const client = SibApiV3Sdk.ApiClient.instance;

const brevoApi = process.env['BREVO_API']
client.authentications['api-key'].apiKey = brevoApi;

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi()


interface SendEmailParams {
    email: string;
    subject: string;
    message: string;
}

export const sendEmail = async ({ email, message, subject }: SendEmailParams) => {
    try {
        await apiInstance.sendTransacEmail({
            sender: {
                email: "mamoidtamer300@gmail.com",
                name: "Aleef Team"
            },
            to: [{ email: email }],
            subject: subject,
            htmlContent: message
        });

    } catch (error: any) {
        console.log(error.response?.body || error.message);
    }
};
