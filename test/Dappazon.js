const { expect } = require("chai")
const { ethers } = require("hardhat")

const tokens = (n) => {
  return ethers.utils.parseUnits(n.toString(), 'ether')
}
const ID = 1;
const NAME = "Shoes";
const CATEGORY = "Clothing";
const IMAGE = "https://ipfs.io/ipfs/QmTYEboq8raiBs7GTUg2yLXB3PMz6HuBNgNfSZBx5Msztg/shoes.jpg";
const COST = tokens(1);
const RATING = 4;
const STOCK = 5;

describe("Dappazon", () => {
  let dappazon;
  let deployer, buyer;

  beforeEach (async() =>{
    [deployer, buyer] = await ethers.getSigners();
    const Dappazon = await ethers.getContractFactory("Dappazon");
    dappazon = await Dappazon.deploy();
  })

  describe ("Deployment", () => {
    it ("Sets the owner", async () => {
      expect (await dappazon.owner()).to.equal(deployer.address);
    })
  })
  
  describe ("Listing", ()=> {
    
    let transaction;

    beforeEach(async () => {
      transaction = await dappazon.connect(deployer).list(ID,NAME,CATEGORY,IMAGE,COST,RATING,STOCK);  
      await transaction.wait();
    })

    it ("Returns item atributes", async () => {
      const item = await dappazon.items(ID);
      expect (item.id).to.equal(ID);
      expect (item.name).to.equal(NAME);
      expect (item.category).to.equal(CATEGORY);
      expect (item.image).to.equal(IMAGE);
      expect (item.cost).to.equal(COST);
      expect (item.rating).to.equal(RATING);
      expect (item.stock).to.equal(STOCK);
    })

    it ("Emits List event", async () => {
      await expect (transaction).to.emit(dappazon, "List");
    })

    it ("Reverts if not the owner calling", async () =>{
      await expect (dappazon.connect(buyer).list(2,NAME,CATEGORY,IMAGE,COST,RATING,STOCK)).to.be.reverted;
    })
  })

  describe ("Buying", ()=> {
    
    let transaction;

    beforeEach(async () => {
      transaction = await dappazon.connect(deployer).list(ID,NAME,CATEGORY,IMAGE,COST,RATING,STOCK);  
      await transaction.wait();
      transaction = await dappazon.connect(buyer).buy(ID, {value: COST});
      await transaction.wait();
    })
    
    it ("Receiving money to contract", async () => {
      let result = await ethers.provider.getBalance(dappazon.address);
      expect (result).to.equal(COST);
    })

    it ("Updates buyer`s order count", async () => {
      const result = await dappazon.ordersCount(buyer.address);
      expect (result).to.equal(1);
    })

    it ("Adds the order", async () => {
      const order = await dappazon.orders(buyer.address, 1);
      expect (order.time).to.not.equal(0);
      expect (order.item.name).to.equal(NAME);
    })
    it ("Emits Buy event",async () => {
     await expect (transaction).to.emit(dappazon, "Buy");
    })

    it ("Reverts on out of stock", async () => {
      transaction = await dappazon.connect(deployer).list(2,NAME,CATEGORY,IMAGE,COST,RATING,0);  
      await transaction.wait();
      await expect (dappazon.connect(buyer).buy(2, {value: COST})).to.be.reverted;
      
    })

    it ("Reverts on wrong item price", async ()=>{
      await expect (dappazon.buy(ID, {value: COST + 1})).to.be.reverted;
    })

  })

  describe ("Withdraw", () => {
    let balanceBefore;
    beforeEach (async () => {
      transaction = await dappazon.connect(deployer).list(ID,NAME,CATEGORY,IMAGE,COST,RATING,STOCK);  
      await transaction.wait();
      transaction = await dappazon.connect(buyer).buy(ID, {value: COST});
      await transaction.wait();

      balanceBefore = await ethers.provider.getBalance(deployer.address);
      await dappazon.connect(deployer).withdraw();
    })
    it ("Withdraws money to owners account", async () => {
       let balanceAfter = await ethers.provider.getBalance(deployer.address);
      
      expect (balanceAfter).to.be.greaterThan(balanceBefore);
    })
    it ("Withdraws money from contract", async () => {
      
      expect (await ethers.provider.getBalance(dappazon.address)).to.equal(0);
      

    })
  })
})
