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

(function() {
    var _yen = {
        paper: 1000,
        denoms: [
            {value: 500, url: 'img/500Yen.png'},
            {value: 100, url: 'img/100Yen.png'},
            {value: 50, url: 'img/50Yen.png'},
            {value: 10, url: 'img/10Yen.png'},
            {value: 5, url: 'img/5Yen.png'},
            {value: 1, url: 'img/1Yen.png'}
        ],
    };

    function walletCoinCount(wallet) {
        var total = 0;
        for (var denom in wallet) {
            total += wallet[denom];
        }

        return total;
    }

    function bestCoinCount(price, currency) {
        return walletCoinCount(bestCoinChange(price, currency));
    }

    function bestCoinChange(price, currency) {
        var change = {};
        for (var i = 0; i < currency.denoms.length; ++i) {
            var denom = currency.denoms[i];
            change[denom.value] = Math.floor(price / denom.value);
            price -= change[denom.value] * denom.value;
        }

        return change;
    }

    function payment(price, currency, wallet) {
        wallet[currency.paper] = Math.ceil(price / currency.paper);
        var result = computePayment(price, currency, wallet, 0);
        delete wallet[currency.paper];
        return result;
    }

    function computePayment(price, currency, wallet, index) {
        var keys = _.keys(wallet);
        var value = keys[index];
        var count = wallet[value];

        var best = null;
        for (var n = 0; n <= count; ++n) {
            var remainder = price - n * value;

            wallet[value] = count - n;

            var curr = null;
            if (index + 1 < keys.length) {
                curr = computePayment(remainder, currency, _.clone(wallet), index + 1);
            }
            else if (remainder <= 0) {
                curr = {
                    coins: bestCoinCount(-remainder, currency) + walletCoinCount(wallet),
                    wallet: _.clone(wallet)
                };
            }

            if (curr === null) {
                continue;
            }

            if (best === null || curr.coins < best.coins) {
                var expense = curr.expense || {};
                expense[value] = n;
                curr.expense = expense;

                best = curr;
            }
        }

        return best;
    }

    function displayPicker(currency) {
        var template = Handlebars.compile($('#picker-template').html());
        $('#picker').empty();
        $('#picker').append(template({currency: currency}));
    }

    function displayPayment(payment) {
        var template = Handlebars.compile($('#payment-template').html());
        $('#payment').empty();
        $('#payment').append(template({payment: payment}));
    }

    window.compute = function() {
        var wallet = {};
        $('.picker-coin').each(function() {
            wallet[$(this).attr('data-value')] = parseInt($(this).val());
        });

        var total = parseInt($('#total').val());
        var details = payment(total, _yen, wallet);

        var change = [];
        for (var i in details.expense) {
            var count = details.expense[i];
            for (var j = 0; j < count; ++j) {
                change.push({url: 'img/' + i + 'Yen.png'});
            }
        }

        displayPayment(change);
    };

    displayPicker(_yen);
})();
