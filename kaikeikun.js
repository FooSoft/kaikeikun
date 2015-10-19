/*
 * Copyright (c) 2015 Alex Yatskov <alex@foosoft.net>
 * Author: Alex Yatskov <alex@foosoft.net>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

function walletCoins(wallet) {
    var total = 0;
    for (var denom in wallet) {
        total += wallet[denom];
    }

    return total;
}

function bestCoinsForPrice(price, denoms) {
    return walletCoins(bestChangeForPrice(price, denoms));
}

function bestChangeForPrice(price, denoms) {
    console.assert(price >= 0);

    var change = {};
    for (var i = 0; i < denoms.length; ++i) {
        var denom = denoms[i];
        change[denom] = Math.floor(price / denom);
        price -= change[denom] * denom;
    }

    return change;
}

function computePayment(price, denoms, wallet, index) {
    var keys = _.keys(wallet);
    var denom = keys[index];
    var count = wallet[denom];

    var best = null;
    for (var n = 0; n <= count; ++n) {
        var remainder = price - n * denom;

        wallet[denom] = count - n;

        var curr = null;
        if (index + 1 < keys.length) {
            curr = computePayment(remainder, denoms, _.clone(wallet), index + 1);
        }
        else if (remainder <= 0) {
            curr = {
                coins: bestCoinsForPrice(-remainder, denoms) + walletCoins(wallet),
                wallet: _.clone(wallet)
            };
        }

        if (curr === null) {
            continue;
        }

        if (best === null || curr.coins < best.coins) {
            var expense = curr.expense || {};
            expense[denom] = n;
            curr.expense = expense;

            best = curr;
        }
    }

    return best;
}
