/*
@author: Fouzia Alzhrani 
@file: extracts event data from blockchain networks for a set of smart contracts.
@version: 1.3.0
*/
//const addresses = require('./included-addresses.json');
const addresses = require('./elg-input-addresses.json');
const connect = require("./connection.json");
const axios = require("axios");
const decoder=require('./decoder');
const formatter=require('./formatter');
const elgReport = require("./elg-report.json");
const fs = require('fs');  

// screen output
const chalk = require('chalk');

var processedAddresses=0;   //by end: should be equal to number of input contract addresses
var startBlock='1';
var endBlock='latest';
var rpcCount=15; //up to (rpcCount x APILimit) record per contract address

/**************************
*
*   MAIN
*
***************************/

console.log('-------------------------------------------------------------------------------------------------------------------------');
//console.log('--------------------------------------------                                 --------------------------------------------');
console.log('--------------------------------------------       ELG Job Started           --------------------------------------------');
//console.log('--------------------------------------------                                 --------------------------------------------');
console.log('-------------------------------------------------------------------------------------------------------------------------');

extract();


/**************************
*
*   FUNCTIONS
*
***************************/

async function extract(){

    for(var i=0, len=addresses.length; i<len; i++){
        try{throw i}
        catch(j){
            //set current contract address info
            let currentAddress = addresses[j]['scID'];
            let api = await getAPI(addresses[j]['network']);
            let apiKey = await getAPIKey(addresses[j]['network']);
            let system = addresses[j]['appName'];
            let network=addresses[j]['network'];
            let topicsList = addresses[j]['eventList'];
            let eventCount = topicsList.length;
            //console.log(topicsList);
            
            //screen output
             processedAddresses++;
             console.log('Processing contract: '+chalk.cyanBright(processedAddresses)+' out of '+chalk.cyanBright(addresses.length.toString().padEnd(20))+'    Current address:'+chalk.cyanBright(currentAddress));
             //console.log('');
             console.log('  On:'+chalk.yellowBright(network.padEnd(30))+'Event Count:'+chalk.yellowBright(eventCount.toString().padEnd(10))+'  System:'+chalk.yellowBright(system));
             
            //get event logs
              for(var k=0; k<eventCount; k++){
                  let topic0=topicsList[k].signature;
                 console.log('    Topic0:'+chalk.greenBright(topic0)+'  Event:'+chalk.greenBright(topicsList[k].name));
                     
                    //get log data for currentAddress            
                    for (var processedRounds=0;  processedRounds<rpcCount; processedRounds++)
                        {   
                            decoder.setActivityCount(0);
                            
                            if(processedRounds===0){
                                decoder.setLastBlockNumber(0);
                            }
                            
                            startBlock=parseInt(decoder.getLastBlockNumber())+1;  

                            //API call URL          
                            let logUrl=api+"?module=logs&action=getLogs&fromBlock="+startBlock+"&toBlock="+endBlock+"&address="+currentAddress+"&topic0="+topic0+"&apikey="+apiKey;

                            await sleep(2000).then(async () => { 
                              await  axios.get(logUrl).then(async function(response) {

                                        await processLog(response.data, addresses[j],processedRounds+1, topic0, topicsList[k].name, startBlock);
                                            if(response.data.status==='0'){
                                                console.log('      No more data can be found for this event.');
                                                processedRounds=rpcCount;
                                            }
                                    })
                                    .catch(err => {
                                         if(err.response){
                                            console.log('HTTP Response Error: '+chalk.red(err.response.statusText));}
                                         else if(err.request){
                                            console.log('HTTP Request Error: '+chalk.red(err.code));}
                                         else{
                                            console.log('Error: '+chalk.red(err.message));
                                         }

                                     })//end catch error for axios
                                })
                                .catch(err => {
                                         if(err.response){
                                            console.log('HTTP Response Error: '+chalk.red(err.response.statusText));}
                                         else if(err.request){
                                            console.log('HTTP Request Error: '+chalk.red(err.code));}
                                         else{
                                            console.log('Error: '+chalk.red(err.message));
                                         }
                            })//end await sleep                   
                        }//end for rounds */
              }//end for events
        }//end catch j
        console.log('-------------------------------------------------------------------------------------------------------------------------');
    }//end for addresses
    
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
}

function hasRecord(status){
    var flag=false;

    if ( status==='1' )
    {
         flag=true;         
    }
       
    return flag;
}

async function processLog(responseData, scInputData, round, topic0, eventName, fromBlock){
    let status =responseData.status;
    let result = responseData.result;
    let toBlock=endBlock;
    // file output
    let elgRecord = {
        System: scInputData.appName,
        Network: scInputData.network,
        Smart_Contract_Address: scInputData.scID,
        Event_Name: eventName,
        Topic0: topic0,
        Round: round,
        From_Block: fromBlock,
        Event_Log_Status: status,
        Event_Log_Records_Count: null
        };
    
    
    let logFileName=scInputData.appName+'-'+scInputData.network+'.csv';
    let decodedLog;
    let events=scInputData.eventList;
    
    if(hasRecord(status)){
    await sleep(2000).then(() => {
            
       decodedLog=decoder.decodeLogText(result, events);        
       //decoder.decodedLogCSV(decodedLog, logFileName, scInputData.appName); 
       formatter.toCSV(decodedLog, logFileName, scInputData.appName); //save copy of modified event log
        
       elgRecord.Event_Log_Records_Count=decoder.getActivityCount();
       toBlock=decoder.getLastBlockNumber(); 
     })
    .catch(err => console.log(chalk.red(err)))//end await sleep 
 
    }//end if has record
    
    //console output
    console.log('      Round:'+chalk.greenBright(round.toString().padEnd(12))+'From Block:'+chalk.greenBright(fromBlock.toString().padEnd(12))+'To Block:'+chalk.greenBright(toBlock.toString().padEnd(12))+'Records:'+chalk.greenBright(decoder.getActivityCount().toString().padEnd(12)));
    
    //write elg result
    writeELGReport(elgRecord);  
      
}//end function processLog

function writeELGReport(record){   
    elgReport.push(record);
    // update local report file 
    fs.writeFileSync('elg-report.json', JSON.stringify(elgReport, undefined, 4)); 
}

   
function finalReport(){
   // console.log('--------------------------------------------                                 --------------------------------------------');
    console.log('--------------------------------------------       ELG Job Finished          --------------------------------------------');
   // console.log('--------------------------------------------                                 --------------------------------------------');
    console.log('-------------------------------------------------------------------------------------------------------------------------');
    console.log('');
    console.log('Total processed contract addresses: '+chalk.greenBright(processedAddresses)+' out of '+chalk.greenBright(addresses.length));
    console.log('');
    console.log('-------------------------------------------------------------------------------------------------------------------------');

}

module.exports={extract};