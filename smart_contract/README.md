# NFT Marketplace

```shell
npx hardhat test
npx hardhat coverage # run coverage check
npx smartcheck -p . # run smartcheck check
REPORT_GAS=true npx hardhat test
```


Coverage:
```
--------------|----------|----------|----------|----------|----------------|
File          |  % Stmts | % Branch |  % Funcs |  % Lines |Uncovered Lines |
--------------|----------|----------|----------|----------|----------------|
 contracts\   |    95.83 |    93.75 |    91.67 |    97.06 |                |
  PepeNFT.sol |    95.83 |    93.75 |    91.67 |    97.06 |            131 |
--------------|----------|----------|----------|----------|----------------|
All files     |    95.83 |    93.75 |    91.67 |    97.06 |                |
--------------|----------|----------|----------|----------|----------------|
```

SmartCheck
```shell
ruleId: SOLIDITY_PRIVATE_MODIFIER_DONT_HIDE_DATA
patternId: 5616b2
severity: 1
line: 13
column: 21
content: private

ruleId: SOLIDITY_VISIBILITY
patternId: 910067
severity: 1
line: 37
column: 4
content: constructor()ERC721("PepeNFT","Pepe"){_grantRole(DEFAULT_ADMIN_ROLE,msg.sender);_grantRole(ADMIN_ROLE,msg.sender);}

SOLIDITY_VISIBILITY :1 # Seeing value of this variable is not harmful
SOLIDITY_LOCKED_MONEY :1 # Admin can withdraw money
SOLIDITY_PRIVATE_MODIFIER_DONT_HIDE_DATA :1
```