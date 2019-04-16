import React, { Component } from "react";
import testDelete from "./testDelete.json";
import getWeb3 from "./utils/getWeb3";
import { Container, Grid, Button, Form} from 'semantic-ui-react';
import { APIClient, Openlaw } from 'openlaw';
import "./App.css";

const URL = "https://app.openlaw.io";  //url for your openlaw instance eg. "http://myinstancename.openlaw.io"
const TEMPLATE_NAME = "testDelete"; //name of template stored on Openlaw
const OPENLAW_USER = 'gubif@mailing.one'; //add your Openlaw login email
const OPENLAW_PASSWORD = 'type12enter' //add your Openlaw password
//create config 
const openLawConfig = {
  server:URL, 
  templateName:TEMPLATE_NAME,
  userName:OPENLAW_USER,
  password:OPENLAW_PASSWORD
}

const apiClient = new APIClient(URL);

class App extends Component {
  
  //initial state of variables for testDelete Template, and web3,etc
    state = { 
  
        Name: '',
        ethereumAddress: '',
        web3: null, 
        accounts: null, 
        contract: null,
        myTemplate: null, 
        myContent: null,
        creatorId:'',
        myCompiledTemplate: null, 
        draftId:''  
    };

    componentDidMount = async () => {
      try {
        //Get network provider and web3 instance.
        const web3 = await getWeb3();
        const accounts = await web3.eth.getAccounts();
        console.log(accounts[0]);
        // Get the contract instance.
        const networkId = await web3.eth.net.getId();
        //Create an instance of smart contract 
        const deployedNetwork = testDelete.networks[networkId];
        const instance = new web3.eth.Contract(
          testDelete.abi,
          deployedNetwork && deployedNetwork.address,
        );
  
        // Set web3, accounts, and contract to the state, and then proceed with an
      // example of interacting with the contract's methods.
      this.setState({ web3, accounts, contract: instance }, this.runExample);

    //Login to your instance with your email and password, return JSON 
    apiClient.login(openLawConfig.userName,openLawConfig.password).then(console.log);
    
    //Retrieve your OpenLaw template by name, use async/await 
    const myTemplate = await apiClient.getTemplate(openLawConfig.templateName);
   
   //pull properties off of JSON and make into variables
    const myTitle = myTemplate.title;
    //set title state
    this.setState({myTitle});

    //Retreive the OpenLaw Template, including MarkDown
    const myContent = myTemplate.content;
    this.setState({myTemplate});
    console.log('myTemplate..',myTemplate);

    //Get the most recent version of the OpenLaw API Tutorial Template
    const versions = await apiClient.getTemplateVersions(openLawConfig.templateName, 20, 1);
    console.log("versions..",versions[0], versions.length);
    
    //Get the creatorID from the template. 
    const creatorId = versions[0].creatorId;
    console.log("creatorId..",creatorId);
    this.setState({creatorId});

    //Get my compiled Template, for use in rendering the HTML in previewTemplate
    const myCompiledTemplate = await Openlaw.compileTemplate(myContent);
    if (myCompiledTemplate.isError) {
      throw "my Template error" + myCompiledTemplate.errorMessage;
    }
     console.log("my compiled template..",myCompiledTemplate);
     this.setState({myCompiledTemplate});

    } catch (error) {
      // Catch any errors for any of the above operations.
      alert(
        `Failed to load web3, accounts, or contract. Check console for details.`,
      );
      console.error(error);
    }
  };
  /*Preview OpenLaw Template*/
previewTemplate = async (event) => {
  console.log('preview of openlaw draft..');
  event.preventDefault();
    //Display HTML 
  try{
    
    const params = {
        "Name": this.state.Name,
        "ethereumAddress": this.state.ethereumAddress,
     };
    
     const executionResult = await Openlaw.execute(this.state.myCompiledTemplate.compiledTemplate, {}, params);
     const agreements = await Openlaw.getAgreements(executionResult.executionResult);
     const html = await Openlaw.renderForReview(agreements[0].agreement,{});
     console.log("this is the html..", html); 
     //set html state
     this.setState({html});
 }//try

catch(error){
    console.log("draft not submitted yet..", error);
}
};

/*HELPERS*/
runExample = async () => {
  const { accounts, contract } = this.state;
  console.log("example openlaw starting");
};
/*converts an email address into an object, to be used with uploadDraft
or upLoadContract methods from the APIClient.
Eventually this function will no longer be needed. */
convertUserObject = (original) => {
  const object = {
    id: {
      id: original.id
    },
    email: original.email,
    identifiers: [
      {
        identityProviderId: "openlaw",
        identifier: original.identifiers[0].id
      }
    ]
  }
  return object;
}

/*Build Open Law Params to Submit for Upload Contract*/
buildOpenLawParamsObj = async (myTemplate, creatorId) => {

  /*const sellerUser = await apiClient.getUserDetails(this.state.sellerEmail);
  const buyerUser = await apiClient.getUserDetails(this.state.buyerEmail);*/

  const object = {
    templateId: myTemplate.id,
    title: myTemplate.title,
    text: myTemplate.content,
    creator: this.state.creatorId,
    parameters: {
      "Ethereum Address": this.state.ethAddress,
      "Name": this.state.Name,
    },
    overriddenParagraphs: {},
    agreements: {},
    readonlyEmails: [],
    editEmails: [],
    draftId: this.state.draftId
  };
  return object;
};

onSubmit = async(event) => {
  console.log('submiting to OL..');
  event.preventDefault();

  try{
    //login to api
    apiClient.login(openLawConfig.userName,openLawConfig.password);
    console.log('apiClient logged in');

    //add Open Law params to be uploaded
    const uploadParams = await this.buildOpenLawParamsObj(this.state.myTemplate,this.state.creatorId);
    console.log('parmeters from user..', uploadParams.parameters);
    console.log('all parameters uploading...', uploadParams);
    
    //uploadDraft, sends a draft contract to "Draft Management", which can be edited. 
    const draftId = await apiClient.uploadDraft(uploadParams);
    console.log('draft id..', draftId);
    this.setState({draftId});

    //uploadContract, this sends a completed contract to "Contract Management", where it can not be edited.
    // const result = await apiClient.uploadContract(uploadParams);
    // console.log('results..', result)
     }
  catch(error){
    console.log(error);
  }
}

render() {
  if (!this.state.web3) {
    return <div>Loading Web3, accounts, and contract...</div>;
  }
  return (
    <div className="App">
      <Container>
              <h1>OpenLaw </h1>
              <h2>{this.state.myTitle} </h2>

           {/* Show HTML in 'Preview' beware dangerouslySet... for xss vulnerable */}
              <Grid columns={2}>

                <Grid.Column>
                  <Form onSubmit = {this.onSubmit}>
                    <Form.Field>
                      <label>Name</label>
                      <input 
                        placeholder = "Name"
                        value = {this.state.Name}
                        onChange = {event => this.setState({Name: event.target.value})}
                      />
                    </Form.Field>
                  <Form onSubmit = {this.onSubmit}>
                    <Form.Field>
                      <label>ethereumAddress</label>
                      <input
                      placeholder = "Paste Ethereum Address Here"
                      value = {this.state.ethereumAddress}
                      onChange = {event => this.setState({ethereumAddress: event.target.value})}
                      />
                    </Form.Field>
                  </Form>                              
                    <Button color='pink' type="submit"> Submit Draft </Button>
                  </Form>

                </Grid.Column>

              <Grid.Column>
                  <div dangerouslySetInnerHTML={{__html: this.state.html}} />
                 <Button onClick = {this.previewTemplate}>Preview</Button>
                </Grid.Column>
              </Grid>

      </Container>
    </div>
  );
}
}

export default App;