define(function() {

	'use strict';


	var _merge = function(seqs) {
		var result = [];

		while (true) {

			var nonemptyseqs = seqs.filter(function(seq) {
				return seq && seq.length;
			});

			if (!nonemptyseqs.length) {
				return result;
			}

			var candidate;

			//find merge candidates among seq heads
			nonemptyseqs.every(function(seq) {
				candidate = seq[0];

				//if the candidate is in the tail of any other seqs
				var notHead = nonemptyseqs.filter(function(seq) {
					var tail = seq.slice(1);
					return tail.indexOf(candidate) !== -1;
				}).length > 0;

				//reject candidate
				if (notHead) {
					candidate = null;
					return true; //continue
				}

				return false; //break
			});

			if (!candidate) {
				throw new Error('Inconsistent heirarchy');
			}

			result.push(candidate);

			//remove candidate
			seqs = nonemptyseqs.map(function(seq) {
				if (seq[0] === candidate) {
					return seq.slice(1);
				}
				return seq;
			});

		}
	};


	//C3 Method Resolution Order (see http://www.python.org/download/releases/2.3/mro/)
	var methodResolutionOrder = function(constructor){
		var bases = constructor._meta.bases.slice(0);

		var seqs =
			[[constructor]]
			.concat(bases.map(function(base) {
				return methodResolutionOrder(base);
			}))
			.concat([bases.slice(0)]);

		//the linearization of C is the sum of C plus the merge of the
		//linearizations of the parents and the list of the parents.
		return _merge(seqs);
	};


	return methodResolutionOrder;

});
