import algosdk, { Account, Algodv2, Transaction, assignGroupID } from "algosdk";

const suggestedParams = async (algod: Algodv2) => await algod.getTransactionParams().do();

//maintain a session or temporary record of this challenge in your DB
export function generateRandomChallenge(): Uint8Array {
    let length = 32;
    let randomValues = new Uint8Array(length);
    window.crypto.getRandomValues(randomValues);
    return randomValues;
}

export function arrayBufferToString(buffer: ArrayBuffer) {
    let str = '';
    const array = new Uint8Array(buffer);
    for (let i = 0; i < array.length; i++) {
      str += String.fromCharCode(array[i]);
    }
    return str;
}

export async function convertDerToJwk(der: ArrayBuffer): Promise<{ key: CryptoKey; jwk: JsonWebKey }> {
    const algo = { name: 'ECDSA', namedCurve: 'P-256' };
    const key = await window.crypto.subtle.importKey('spki', der, algo, true, ['verify']);
    const jwk = await window.crypto.subtle.exportKey('jwk', key);
    return { key, jwk };
}

export async function createAlgorandPasskey(): Promise<PublicKeyCredential | null> {
    if (!navigator.credentials || !navigator.credentials.create || !navigator.credentials.get) {
        alert("Your browser does not support the Web Authentication API");
    }

    let cred = navigator.credentials.create({
        publicKey: {
          challenge: generateRandomChallenge(),
          rp: { name: "Akita", id: window.location.hostname },
          //here you'll want to pass the user's info
          user: { id: new Uint8Array(16), name: "krby@akita.community", displayName: "krby.algo"},
          pubKeyCredParams: [
            { type: "public-key", alg: -8 },    
            { type: "public-key", alg: -7 },    
            // { type: "public-key", alg: -256 }
          ],
          timeout: 60000,
          authenticatorSelection: {
            residentKey: "preferred",
            userVerification: "required",
          },
          attestation: "none",
        }
    });
   
    //we update our demo buttons
    return (cred as Promise<PublicKeyCredential>);   
}

export async function verifyAlgorandPasskey(rawID: BufferSource): Promise<boolean> {
    try {
      // to verify a user's credentials, we pass the 
      // unique ID of the passkey we saved against the user profile
      let cred = await navigator.credentials.get({
          publicKey: {
            challenge: generateRandomChallenge(),
            allowCredentials: [{ type: "public-key", id: rawID }]
          }
      });
      console.log(cred);  
      return true;
    }
    catch(err){
      return false;
    }
}

export async function passkeySign(challenge: Uint8Array, rawID?: BufferSource): Promise<PublicKeyCredential | null> {
    try {
      let options: CredentialRequestOptions = {
        mediation: "required",
        publicKey: {
          challenge,
          // allowCredentials: [{ type: "public-key", id: rawID }]
        },
      };

      if (!!rawID) {
        options!.publicKey!.allowCredentials = [{ type: "public-key", id: rawID }];
      }

      return (navigator.credentials.get(options) as Promise<PublicKeyCredential>);
    }
    catch(err){
        return null;
    }
}


export const fundLsig = async (
    algod: Algodv2,
    from: Account,
    lsig: algosdk.LogicSig,
    amount: number
) => {
    const fundSmartSigTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: from.addr,
        receiver: lsig.address(),
        amount,
        suggestedParams: await suggestedParams(algod),
    });

    const signedTxn = fundSmartSigTxn.signTxn(from.sk);

    const { txid } = await algod.sendRawTransaction(signedTxn).do();

    await algosdk.waitForConfirmation(algod, fundSmartSigTxn.txID().toString(), 3);
    await algod.accountInformation(lsig.address()).do();

    return txid;
};

// export async function giveFoundLogicSign(algod: Algodv2, logicSign: algosdk.LogicSig) {
//     try {
//         const from = await createAlice(algod);
//         await fundLsig(algod, from, logicSign, 1e6);
//         return from;
//     } catch (error) {
//         throw new Error(">> Error give found to logic Signature : " + error);
//     }
// }

export async function newLogicSigSecp256r1(algod: Algodv2, pkX: string, pkY: string): Promise<algosdk.LogicSig> {
    console.log("creating logic signature secp256r1");
    
    const hexAddressX = `0x${pkX}`;
    const hexAddressY = `0x${pkY}`;

    // authenticatorData + hashed clientData
    // const smartSigSource = `#pragma version 10\nb route_logic\nroute_logic:\nint 5\nargs\ndup\nlen\nint 32\n==\nassert\n\nint 4\nargs\ndup\nlen\nint 32\n==\nassert\n\nint 3\nargs\nextract 2 0\n\nint 2\nargs\nextract 2 0\n\nint 1\nargs\nextract 2 0\n\nint 0\nargs\nextract 2 0\n\ncallsub logic\nint 1\nreturn\n\nlogic:\nproto 6 0\n\nbyte 0x\ndup\n\nframe_dig -2\nframe_dig -3\nconcat\nframe_dig -4\nconcat\nsha256\nframe_bury 0\n\nframe_dig -1\nframe_dig 0\nconcat\nsha256\nframe_bury 1\n\ntxn TxID\nframe_dig -3\nbase64_decode URLEncoding\n==\nassert\n\nframe_dig 1\nframe_dig -5\nframe_dig -6\npushbytes ${hexAddressX}\npushbytes ${hexAddressY}\necdsa_verify Secp256r1\nassert\nretsub\n`

    // with groups
    const smartSigSource = `#pragma version 10\nb route_logic\nroute_logic:\nint 5\nargs\ndup\nlen\nint 32\n==\nassert\nint 4\nargs\ndup\nlen\nint 32\n==\nassert\nint 3\nargs\nextract 2 0\nint 2\nargs\nextract 2 0\nint 1\nargs\nextract 2 0\nint 0\nargs\nextract 2 0\ncallsub logic\nint 1\nreturn\nlogic:\nproto 6 0\nbyte 0x\ndup\n\nframe_dig -2\nframe_dig -3\nconcat\nframe_dig -4\nconcat\nsha256\nframe_bury 0\nframe_dig -1\nframe_dig 0\nconcat\nsha256\nframe_bury 1\nglobal GroupSize\nint 1\n>\nbz if0_else\nglobal GroupID\nframe_dig -3\nbase64_decode URLEncoding\n==\nassert\nb if0_end\nif0_else:\ntxn TxID\nframe_dig -3\nbase64_decode URLEncoding\n==\nassert\nif0_end:\nframe_dig 1\nframe_dig -5\nframe_dig -6\npushbytes ${hexAddressX}\npushbytes ${hexAddressY}\necdsa_verify Secp256r1\nassert\nretsub\n`

    console.log('new lsig', smartSigSource);

    const result = await algod.compile(new Uint8Array(Buffer.from(smartSigSource))).do();
    const b64program = result.result;
    const smartSig = new algosdk.LogicSig(new Uint8Array(Buffer.from(b64program, "base64")));
    return smartSig;
}

export async function createLsigTxn(
    { algod, lsig, to, amount, count }: {
        algod: Algodv2,
        lsig: algosdk.LogicSig,
        to: algosdk.Account,
        amount: number,
        count: number
    }
): Promise<Transaction[]> {
    let txns: Transaction[] = [];

    for (let i = 0; i < count; i++) {
        const smartSigTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
            sender: lsig.address(),
            receiver: to.addr,
            amount: amount * i,
            suggestedParams: await suggestedParams(algod),
        });

        txns = [
            ...txns,
            smartSigTxn
        ];
    }

    const group = (txns.length > 1) ? txns : assignGroupID(txns);

    return group;
};

function b64UrlEncodeFromBuffer(b: Buffer): string {
    return b.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

export async function createSignedTxn({ algod, key, to, lsig, passKeyID }: { algod: Algodv2, key: CryptoKey, to: algosdk.Account, lsig: algosdk.LogicSig, passKeyID: BufferSource }): Promise<string> {
    try {
        const txns: Transaction[] = await createLsigTxn({ algod, lsig, to, amount: 1e5, count: 1 });

        console.log("awaiting passkey authorization");
        console.log('txns length : ', txns.length);

        let creds = (txns.length > 1)
            ? await passkeySign(new Uint8Array(txns[0].group!), passKeyID)
            : await passkeySign(new Uint8Array(txns[0].rawTxID()), passKeyID);

        const clientData = creds!.response.clientDataJSON;
        const decodedClientData = arrayBufferToString(clientData);
        console.log("clientData : ", clientData);
        console.log("dclientData : ", decodedClientData);
        console.log("length : ", decodedClientData.length);

        // @ts-expect-error
        const authenticatorData: ArrayBuffer = creds?.response.authenticatorData; 

        // find the index of the first byte of our txnID in the clientData
        const splitIndex = (txns.length > 1)
            ? decodedClientData.indexOf(b64UrlEncodeFromBuffer(Buffer.from(txns[0].group!)))
            : decodedClientData.indexOf(b64UrlEncodeFromBuffer(Buffer.from(txns[0].rawTxID())));

        const splitLength = (txns.length > 1)
            ? b64UrlEncodeFromBuffer(Buffer.from(txns[0].group!)).length
            : b64UrlEncodeFromBuffer(Buffer.from(txns[0].rawTxID())).length;
        
        const clientDataPartOne = clientData.slice(0, splitIndex);
        const clientDataPartTwo = clientData.slice(splitIndex, splitIndex + splitLength);
        const clientDataPartThree = clientData.slice(splitIndex + splitLength);

        // console.log("clientDataPartOne   : ", arrayBufferToString(clientDataPartOne));
        // console.log("clientDataPartTwo   : ", arrayBufferToString(clientDataPartTwo));
        // console.log("clientDataPartThree : ", arrayBufferToString(clientDataPartThree));

        // sha256 hash the clientData
        const hashBuffer = await crypto.subtle.digest('SHA-256', Buffer.concat([
            new Uint8Array(Buffer.from(clientDataPartOne)),
            new Uint8Array(Buffer.from(clientDataPartTwo)),
            new Uint8Array(Buffer.from(clientDataPartThree)),
        ]));

        // concat the authenticatorData and the hashed clientData
        const authenticatorDataHash = Buffer.from(authenticatorData);
        const clientDataHash = Buffer.from(hashBuffer);
        const bufferData = Buffer.concat([
            new Uint8Array(authenticatorDataHash),
            new Uint8Array(clientDataHash)
        ]);

        const combinedData = bufferData.buffer.slice(
            bufferData.byteOffset,
            bufferData.byteOffset + bufferData.byteLength
        );

        // @ts-expect-error
        const signature: ArrayBuffer = creds!.response.signature;

        return await sendTxns(
            algod,
            key,
            combinedData as ArrayBuffer,
            authenticatorData,
            clientDataPartOne,
            clientDataPartTwo,
            clientDataPartThree,
            signature,
            txns,
            lsig
        );
    } catch (error) {
        throw new Error("error createSignedTxn : " + error);
    }
}

const sendTxns = async (
    algod: Algodv2,
    pk: CryptoKey,
    signedData: ArrayBuffer,
    authenticatorData: ArrayBuffer,
    clientDataPartOne: ArrayBuffer,
    clientDataPartTwo: ArrayBuffer,
    clientDataPartThree: ArrayBuffer,
    signature: ArrayBuffer,
    smartSigTxns: Transaction[],
    lsig: algosdk.LogicSig
): Promise<string> => {
    var usignature = new Uint8Array(signature);
    var rStart = usignature[4] === 0 ? 5 : 4;
    var rEnd = rStart + 32;
    var sStart = usignature[rEnd + 2] === 0 ? rEnd + 3 : rEnd + 2;
    var r = usignature.slice(rStart, rEnd);
    var s = usignature.slice(sStart);
    var rawSignature = new Uint8Array(Buffer.concat([r, s]));

    const abiBytes = algosdk.ABIType.from("byte[]");
    const abi32Bytes = algosdk.ABIType.from("byte[32]");

    lsig.args = [
        abiBytes.encode(new Uint8Array(Buffer.from(authenticatorData))),
        abiBytes.encode(new Uint8Array(Buffer.from(clientDataPartOne))),
        abiBytes.encode(new Uint8Array(Buffer.from(clientDataPartTwo))),
        abiBytes.encode(new Uint8Array(Buffer.from(clientDataPartThree))),
        abi32Bytes.encode(r),
        abi32Bytes.encode(s)
    ];

    console.log(smartSigTxns);
  
    // check signature with public key and signed data 
    var verified = await crypto.subtle.verify(
        { name: "ECDSA", hash: { name: "SHA-256" } },
        pk,
        rawSignature,
        signedData,
    );

    console.log('verified', verified)
    console.log("smartSigTxn group id : ", smartSigTxns[0].group);
    
    const signedGroup = smartSigTxns.map((txn) => algosdk.signLogicSigTransactionObject(txn, lsig));  

    console.log("signedGroup : ", signedGroup);

    const sendTxn = await algod.sendRawTransaction(signedGroup.map(x => x.blob)).do();

    console.log("sent, txn id : " + sendTxn.txid);

    await algosdk.waitForConfirmation(algod, sendTxn.txid, 10);

    console.log("txn confirmed");

    return sendTxn.txid;
};