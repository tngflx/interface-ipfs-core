'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
const statsTests = require('./utils/stats')
chai.use(dirtyChai)
const CID = require('cids')

module.exports = (common) => {
  describe('.bitswap online', () => {
    let ipfs
    const key = 'QmUBdnXXPyoDFXj3Hj39dNJ5VkN3QFRskXxcGaYFBB8CNR'

    before(function (done) {
      // CI takes longer to instantiate the daemon, so we need to increase the
      // timeout for the before step
      this.timeout(60 * 1000)

      common.setup((err, factory) => {
        expect(err).to.not.exist()
        factory.spawnNode((err, node) => {
          expect(err).to.not.exist()
          ipfs = node
          ipfs.block.get(new CID(key))
            .then(() => {})
            .catch(() => {})
          setTimeout(done, 250)
        })
      })
    })

    after((done) => common.teardown(done))

    it('.stat', (done) => {

      ipfs.bitswap.stat((err, stats) => {
        statsTests.expectIsBitswap(err, stats)
        done()
      })
    })

    it('.wantlist', (done) => {
      ipfs.bitswap.wantlist((err, list) => {
        expect(err).to.not.exist()
        expect(list[0].cid.toBaseEncodedString()).to.equal(key)
        done()
      })
    })

    it('.unwant', (done) => {
      ipfs.bitswap.unwant(new CID(key), (err) => {
        ipfs.bitswap.wantlist((err, list) => {
          expect(list).to.be.empty()
          done()
        })
      })
    })
  })

  describe('.bitswap offline', () => {
    let ipfs

    before(function (done) {
      // CI takes longer to instantiate the daemon, so we need to increase the
      // timeout for the before step
      this.timeout(60 * 1000)

      common.setup((err, factory) => {
        expect(err).to.not.exist()
        factory.spawnNode((err, node) => {
          expect(err).to.not.exist()
          ipfs = node
          ipfs.id((err, id) => {
            expect(err).to.not.exist()
            ipfs.stop((err) => {
              // TODO: go-ipfs returns an error, https://github.com/ipfs/go-ipfs/issues/4078
              if (!id.agentVersion.startsWith('go-ipfs')) {
                expect(err).to.not.exist()
              }
              done()
            })
          })
        })
      })
    })

    it('.stat gives error while offline', () => {
      ipfs.bitswap.stat((err, stats) => {
        expect(err).to.exist()
        expect(stats).to.not.exist()
      })
    })

    it('.wantlist gives error if offline', () => {
      ipfs.bitswap.wantlist((err, list) => {
        expect(err).to.exist()
        expect(list).to.not.exist()
      })
    })

    it('.unwant gives error if offline', () => {
      expect(() => ipfs.bitswap.unwant(new CID(key), (err) => {
        expect(err).to.exist()
      }))
    })
  })
}
