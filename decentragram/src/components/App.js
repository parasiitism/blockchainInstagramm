import React, { Component } from 'react';
import Web3 from 'web3';
import Identicon from 'identicon.js';
import './App.css';
import Decentragram from '../abis/Decentragram.json'
import Navbar from './Navbar'
import Main from './Main'

//Declare IPFS
const {create} = require('ipfs-http-client')

async function ipfsClient(){
  const ipfs= await create({ host: 'ipfs.infura.io', port: 5001, protocol: 'https' }) // leaving out the arguments will default to these values
  return ipfs
}

let ipfs;
async function declare(){
   ipfs=await ipfsClient();
}

declare()

class App extends Component {
  
  async componentWillMount() {
    await this.loadWeb3()
    await this.loadBlockchainData()
  }

  //boiler plate to load web3 with metamask
  async loadWeb3() {
    if (window.ethereum) {
      window.web3 = new Web3(window.ethereum)
      await window.ethereum.enable()
    }
    else if (window.web3) {
      window.web3 = new Web3(window.web3.currentProvider)
    }
    else {
      window.alert('Non-Ethereum browser detected. You should consider trying MetaMask!')
    }
  }
   
  async loadBlockchainData(){
    const web3 = window.web3
    // Load account
    const accounts = await web3.eth.getAccounts()
    console.log(accounts[0])
    this.setState({ account: accounts[0] })
    // Network ID...
    const networkId = await web3.eth.net.getId() 
    const networkData = Decentragram.networks[networkId] 
    if(networkData){
      const decentragram = new web3.eth.Contract(Decentragram.abi, networkData.address) 
      this.setState({ decentragram })
      const imagesCount = await decentragram.methods.imageCount().call() 
      this.setState({ imagesCount })
      this.setState({loading:false});
        // Load images
      for (var i = 1; i <= imagesCount; i++) {
          const image = await decentragram.methods.images(i).call()
          this.setState({
            images: [...this.state.images, image]
          })
      }
       // Sort images. Show highest tipped images first
       this.setState({
        images: this.state.images.sort((a,b) => b.tipAmount - a.tipAmount )
      })
    }
    else {
      window.alert('Decentragram contract not deployed to detected network.')
    }
  }

  captureFile = event => {

    event.preventDefault()
    const file = event.target.files[0]//js function to read file
    const reader = new window.FileReader() //windows method
    reader.readAsArrayBuffer(file) //converts to budder for using in ipfs

    reader.onloadend = () => {
      this.setState({ buffer: Buffer(reader.result) })
      console.log('buffer', this.state.buffer)
    }
  }

  uploadImage =async description => {
    console.log("Submitting file to ipfs...")

    //adding file to the IPFS
    const result=await ipfs.add(this.state.buffer)
    console.log(result.path)
    if(result){
      this.setState({ loading: true })
      this.state.decentragram.methods.uploadImage(result.path, description).send({ from: this.state.account }).on('transactionHash', (hash) => {
        this.setState({ loading: false })
        window.location.reload()
      })
    }else{
      console.error("Error IPFS")
        return
    }
  }

  tipImageOwner(id, tipAmount) {
    this.setState({ loading: true })
    this.state.decentragram.methods.tipImageOwner(id).send({ from: this.state.account, value: tipAmount }).on('transactionHash', (hash) => {
      this.setState({ loading: false })
      window.location.reload()
    })
  }

  constructor(props) {
    super(props)
    this.state = {
      account: '',
      decentragram: null,
      images: [],
      loading: true
    }
    this.uploadImage = this.uploadImage.bind(this)
    this.tipImageOwner = this.tipImageOwner.bind(this)
    this.captureFile = this.captureFile.bind(this)
  }

  render() {
    return (
      <div>
        <Navbar account={this.state.account} />
        { this.state.loading
          ? <div id="loader" className="text-center mt-5"><p>Loading...</p></div>
          : <Main
               captureFile={this.captureFile}
               uploadImage={this.uploadImage}
               images={this.state.images}
               tipImageOwner={this.tipImageOwner}
            />
          }
      </div>
    );
  }
}

export default App;