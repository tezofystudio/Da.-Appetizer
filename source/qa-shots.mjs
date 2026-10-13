import {chromium} from '@playwright/test';
const b=await chromium.launch();const errors=[];
async function run(w,h,prefix,bn=false,dark=false){
 const p=await b.newPage({viewport:{width:w,height:h},hasTouch:w<761,isMobile:w<761});
 p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await p.goto('http://127.0.0.1:3000/',{waitUntil:'networkidle'});
 if(bn)await p.locator('#langToggle').click(); if(dark)await p.locator('#themeToggle').click();
 await p.locator('#homeCats [data-cat="Burger"]').click();await p.waitForTimeout(1500);
 await p.screenshot({path:`qa/${prefix}-1-preview.png`});
 await p.locator('[data-da-action="sheet-up"]').click();await p.waitForTimeout(900);
 await p.screenshot({path:`qa/${prefix}-2-sheet.png`});
 await p.locator('.da-add-button').click();await p.locator('.da-sheet-cart').click();await p.waitForTimeout(900);
 await p.screenshot({path:`qa/${prefix}-3-cart.png`});
 await p.locator('[data-da-action="cart-close"]').click();await p.waitForTimeout(400);
 await p.locator('[data-da-action="sheet-down"]').click();await p.waitForTimeout(400);
 await p.locator('[data-da-action="categories-menu"]').click();await p.waitForTimeout(500);
 await p.screenshot({path:`qa/${prefix}-4-categories.png`});
 await p.close();
}
await run(390,844,'m390',true);
await run(360,640,'m360',false,true);
await run(1440,900,'d1440',true);
console.log('errors',errors);await b.close();
