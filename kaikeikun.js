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
        values: [],
        denoms: {
            500: {url: 'img/500Yen.png'},
            100: {url: 'img/100Yen.png'},
            50:  {url: 'img/50Yen.png'},
            10:  {url: 'img/10Yen.png'},
            5:   {url: 'img/5Yen.png'},
            1:   {url: 'img/1Yen.png'}
        },
    };

    function walletCoinCount(wallet) {
        var total = 0;
        for (var denom in wallet) {
            total += wallet[denom];
        }

        return total;
    }

    function walletCoinSum(wallet) {
        var total = 0;
        for (var denom in wallet) {
            total += denom * wallet[denom];
        }

        return total;
    }

    function bestCoinCount(price, currency) {
        return walletCoinCount(bestCoinChange(price, currency));
    }

    function bestCoinChange(price, currency) {
        var change = {};
        for (var i = 0; i < currency.values.length; ++i) {
            var value = currency.values[i];
            var denom = currency.denoms[value];
            change[value] = Math.floor(price / value);
            price -= change[value] * value;
        }

        return change;
    }

    function makePayment(price, currency, wallet, aggressive) {
        wallet[currency.paper] = Math.ceil(price / currency.paper);

        var points = [];
        var sum    = 0;

        for (var i = currency.values.length - 1; i >= 0; --i) {
            var value = currency.values[i];
            if (!_.has(wallet, value)) {
                continue;
            }

            sum += value * wallet[value];
            points.push(sum);
        }

        points.reverse();

        return computePayment(price, currency, wallet, aggressive, points, 0);
    }

    function computePayment(price, currency, wallet, aggressive, points, index) {
        var value = currency.values[index];
        var count = wallet[value] || 0;

        var best = null;
        for (var n = 0; n <= count; ++n) {
            var remainder = price - n * value;

            wallet[value] = count - n;

            var curr = null;
            if (index + 1 < currency.values.length) {
                if (remainder <= points[index + 1]) {
                    curr = computePayment(remainder, currency, _.clone(wallet), aggressive, points, index + 1);
                }
            }
            else if (remainder <= 0) {
                curr = {
                    coins: bestCoinCount(-remainder, currency) + (aggressive ? walletCoinCount(wallet) : 0),
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
        $('.picker-coin').on('input propertychange paste', function() {
            saveWallet();
        });
    }

    function displayPayment(payment) {
        var template = Handlebars.compile($('#payment-template').html());
        $('#payment').empty();
        $('#payment').append(template({payment: payment}));
    }

    function displayChange(change) {
        var template = Handlebars.compile($('#change-template').html());
        $('#change').empty();
        $('#change').append(template({change: change}));
    }

    function pickerToWallet() {
        var wallet = {};
        $('.picker-coin').each(function() {
            wallet[$(this).attr('data-value')] = parseInt($(this).val());
        });

        return wallet;
    }

    function walletToPicker(wallet) {
        for (var value in wallet) {
            $('.picker-coin[data-value="' + value + '"]').val(wallet[value] || 0);
        }
    }

    function buildCoinListing(currency, data) {
        var result = [];
        for (var value in data) {
            if (currency.values.indexOf(value) === -1) {
                continue;
            }

            var coins = [];
            for (var n = 0; n < data[value]; ++n) {
                coins.push(currency.denoms[value].url);
            }

            if (coins.length > 0) {
                result.push(coins);
            }
        }

        return result;
    }

    function saveWallet() {
        localStorage.wallet = JSON.stringify(pickerToWallet());
    }

    function loadWallet() {
        walletToPicker(JSON.parse(localStorage.wallet || '{}'));
    }

    window.compute = function(deduct) {
        if (_yen.values.length === 0) {
            _yen.values = _.map(_.keys(_yen.denoms), function (n) { return parseInt(n); });
            _yen.values.sort(function(a, b) {
                return b - a;
            });
        }

        var total      = parseInt($('#total').val());
        var wallet     = pickerToWallet();
        var aggressive = $('#aggressive').is(':checked');

        var payment = [];
        var change  = [];

        var details = makePayment(total, _yen, wallet, aggressive);
        if (details !== null) {
            var difference = walletCoinSum(details.expense) - total;

            change  = buildCoinListing(_yen, bestCoinChange(difference, _yen));
            payment = buildCoinListing(_yen, details.expense);

            if (deduct) {
                for (var i in details.expense) {
                    wallet[i] -= details.expense[i];
                }

                walletToPicker(wallet);
            }
        }

        displayPayment(payment);
        displayChange(change);
    };

    displayPicker(_yen);
    loadWallet();
})();
