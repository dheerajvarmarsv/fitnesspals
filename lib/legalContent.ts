import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';

const PRIVACY_POLICY = `
Dhesha Developments built the CTP Health app as a Free app. This SERVICE is provided by Dhesha Developments at no cost and is intended for use as is.

This page is used to inform visitors regarding our policies with the collection, use, and disclosure of Personal Information if anyone decided to use our Service.

If you choose to use our Service, then you agree to the collection and use of information in relation to this policy. The Personal Information that we collect is used for providing and improving the Service. We will not use or share your information with anyone except as described in this Privacy Policy.

Information Collection and Use
For a better experience, while using our Service, we may require you to provide us with certain personally identifiable information, including but not limited to name, email address, and profile information. The information that we request will be retained by us and used as described in this privacy policy.

Log Data
We want to inform you that whenever you use our Service, in a case of an error in the app we collect data and information (through third-party products) on your phone called Log Data. This Log Data may include information such as your device Internet Protocol ("IP") address, device name, operating system version, the configuration of the app when utilizing our Service, the time and date of your use of the Service, and other statistics.

Security
We value your trust in providing us your Personal Information, thus we are striving to use commercially acceptable means of protecting it. But remember that no method of transmission over the internet, or method of electronic storage is 100% secure and reliable, and we cannot guarantee its absolute security.

Changes to This Privacy Policy
We may update our Privacy Policy from time to time. Thus, you are advised to review this page periodically for any changes. We will notify you of any changes by posting the new Privacy Policy on this page. These changes are effective immediately after they are posted on this page.

Contact Us
If you have any questions or suggestions about our Privacy Policy, do not hesitate to contact us at dhesha.developments@gmail.com.`;

const TERMS_OF_SERVICE = `
These terms and conditions apply to the CTP Health app (hereby referred to as "Application") for mobile devices that was created by Dhesha Developments (hereby referred to as "Service Provider") as a Free service.

Upon downloading or utilizing the Application, you are automatically agreeing to the following terms. It is strongly advised that you thoroughly read and understand these terms prior to using the Application. Unauthorized copying, modification of the Application, any part of the Application, or our trademarks is strictly prohibited. Any attempts to extract the source code of the Application, translate the Application into other languages, or create derivative versions are not permitted. All trademarks, copyrights, database rights, and other intellectual property rights related to the Application remain the property of the Service Provider.

The Service Provider is dedicated to ensuring that the Application is as beneficial and efficient as possible. As such, they reserve the right to modify the Application or charge for their services at any time and for any reason. The Service Provider will never charge you for the Application or its services without making it very clear to you exactly what you're paying for.

Data Collection and Usage
For a better experience while using our Application, we may require you to provide us with certain personally identifiable information. The information that we request will be retained by us and used as described in our privacy policy.

Third-Party Services
The Application may use third-party services that have their own Terms and Conditions. Links to the Terms and Conditions of third-party service providers used by the Application will be provided when applicable.

Changes to Terms and Conditions
We may update our Terms and Conditions from time to time. Thus, you are advised to review this page periodically for any changes. We will notify you of any changes by posting the new Terms and Conditions on this page. These changes are effective immediately after they are posted.

Contact Us
If you have any questions or suggestions about our Terms and Conditions, do not hesitate to contact us at dhesha.developments@gmail.com.`;

export function loadLegalContent(type: 'privacy-policy' | 'terms-of-service'): string {
  return type === 'privacy-policy' ? PRIVACY_POLICY : TERMS_OF_SERVICE;
} 