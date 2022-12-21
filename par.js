/*
@author: Fouzia Alzhrani 
@file: recognize if a given smart contract is process aware or not.
@version: 1.1.0
*/

const addresses = require('./par-input-addresses.json');
const inspectionReport = require("./par-report.json");
const connect = require("./connection.json");
const axios = require("axios");
const fs = require('fs');   

// screen output
const chalk = require('chalk');
var processedAddresses=0;   //by end: should be equal to number of input contract addresses
var includedContracts=0; 
var excludedContracts=0; 

/**************************
*
*   MAIN
*
***************************/

console.log('-------------------------------------------------------------------------------------------------------------------------');
//console.log('--------------------------------------------                                 --------------------------------------------');
console.log('--------------------------------------------       PAR Job Started           --------------------------------------------');
//console.log('--------------------------------------------                                 --------------------------------------------');
console.log('-------------------------------------------------------------------------------------------------------------------------');

main();


/**************************
*
*   FUNCTIONS
*
***************************/

async function main(){

    for(var i=0, len=addresses.length; i<len; i++){
        try{throw i}
        catch(j){
            //set current contract address
            let currentAddress = addresses[j]['scID'];
            let api = await getAPI(addresses[j]['network']);
            let apiKey = await getAPIKey(addresses[j]['network']);
            
            //screen output
            processedAddresses++,
            console.log('Processing contract: '+chalk.yellowBright(processedAddresses)+' out of '+chalk.yellowBright(addresses.length.toString().padEnd(20))+'    Current address:'+chalk.yellowBright(currentAddress));
             //console.log('');
             console.log('  On:'+chalk.cyanBright(addresses[j]['network'].padEnd(30))+'  System:'+chalk.cyanBright(addresses[j]['appName']));
            
            //get contract ABI for currentAddress
            let abiUrl =api+'?module=contract&action=getabi&address='+currentAddress+'&apikey='+apiKey;
             await sleep(2000).then(async() => {
                 
                 
                 
                 //HTTP request
                 await axios.get(abiUrl).then(async function(response) {
                    await processContract(response.data, addresses[j])

                    })
                    .catch(err => {                      
                        if(err.response){
                           console.log('HTTP Response Error: '+err.response.statusText);}
                        else if(err.request){
                           console.log('HTTP Request Error: '+err.code);}
                        else{
                           console.log('Error: '+err.message);
                        }
                     })//end catch err
                })//end await sleep
        }//end catch j
        console.log('-------------------------------------------------------------------------------------------------------------------------');
    }//end for
    
    await finalReport();
}


function sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
   }

function getAPI(network){
    let api = "";
     for (var i=0, len=connect.length; i<len; i++){
        
         if (connect[i].network==network)
             {
                 api = connect[i].api;
                 return api;
             }
    }
   // return api;
    
}


function getAPIKey(network){
    let apiKey = "";
     for (var i=0, len=connect.length; i<len; i++){
        
         if (connect[i].network==network)
             {
                 apiKey = connect[i].apiKey;
                 return apiKey;
             }
    }
   // return api;
    
}

async function processContract(responseData, scInputData){
    let status =responseData.status;
    let result = responseData.result;

    // file output
    let inspectionRecord = {
        System: scInputData.appName,
        Network: scInputData.network,
        Smart_Contract_Address: scInputData.scID,
        Smart_Contract_Status: status,
        Class : null,
        Reason: null,
        eventList: null};

    //inspect current smart contract
    if(isVerified(status)){
        inspectionRecord.Smart_Contract_Status="Verified";
        if(hasEvent(result)){
            let events= getEventList(result);
            inspectionRecord.Class="Include";
            inspectionRecord.Reason="Smart contract is verified and has events";
            inspectionRecord.eventList=events;
            includedContracts++;
        }
        else{
            inspectionRecord.Class="Exclude";
            inspectionRecord.Reason="Smart contract is verified but does not have events";
            excludedContracts++;
        }//end if has event        
    }
    else{
        inspectionRecord.Smart_Contract_Status="Not Verified";
        inspectionRecord.Class="Exclude";
        inspectionRecord.Reason="Smart contract is not verified";
        excludedContracts++;
    }//end if is verified
    
    //console output
    console.log('Contract Status:'+chalk.greenBright(inspectionRecord.Smart_Contract_Status.padEnd(30))+'Class:'+chalk.greenBright(inspectionRecord.Class.padEnd(20))+'Reason:'+chalk.greenBright(inspectionRecord.Reason));
    
    //write inspection result
    writeInspectionReport(inspectionRecord);
}//end function processContract
    
 
function writeInspectionReport(record){   
    inspectionReport.push(record);
    // update local report file 
    fs.writeFileSync('par-report.json', JSON.stringify(inspectionReport, undefined, 4)); 
}
   

function isVerified(status){
    let flag=false;
    if(status==='1'){
        flag = true;
    }
    return flag;
}

            
function hasEvent(result){
    data=JSON.parse(result);
    for (var i=0, len=data.length; i<len; i++){
        
         if (data[i].type=="event")
             {
                 return true;
             }
    }
    return false;
}


function getEventList(result){
    //connect to Web3 API
    const Web3 = require('web3');
    var web3 = new Web3( Web3.givenProvider || new Web3.providers.WebsocketProvider('ws://remotenode.com:8546'));
    
    //local variables
    let eventList = [];
 
    contractABI=JSON.parse(result);
    
    //calculate event signatures
    for (var i=0, len=contractABI.length; i<len; i++){
         if (contractABI[i].type=="event")
             {  let eventListItem={};
                let eSig = web3.eth.abi.encodeEventSignature(contractABI[i]);
              
                 eventListItem.anonymous=contractABI[i].anonymous;
                 eventListItem.name=contractABI[i].name;
                 eventListItem.signature=eSig;
                 eventListItem.inputs=contractABI[i].inputs;
                 eventList.push(eventListItem);
                 //console.log(eventList);
             }

       }
    //console.log(eventList);
    return eventList;
}

function finalReport(){
   // console.log('--------------------------------------------                                 --------------------------------------------');
    console.log('--------------------------------------------       PAR Job Finished          --------------------------------------------');
   // console.log('--------------------------------------------                                 --------------------------------------------');
    console.log('-------------------------------------------------------------------------------------------------------------------------');
    console.log('');
    console.log('Total processed contracts: '+processedAddresses+' out of '+addresses.length);
    console.log('Inspection Report: Include: '+includedContracts+'    Exclude: '+excludedContracts);
    console.log('');
    console.log('-------------------------------------------------------------------------------------------------------------------------');

}